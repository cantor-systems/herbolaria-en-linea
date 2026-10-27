import { NextRequest, NextResponse } from 'next/server';
import {
  InvalidWebhookSignatureError,
  WebhookSignatureValidator,
} from 'mercadopago';
import {
  getMercadoPagoWebhookSecret,
  MercadoPagoConfigurationError,
} from '@/lib/mercadopago/client';
import { fetchVerifiedPayment, isValidPaymentId } from '@/lib/mercadopago/paymentVerification';
import { processOrderApprovedNotifications } from '@/lib/orders/notifications';
import { OrderPersistenceError, recordVerifiedPayment } from '@/lib/orders/repository';
import { SupabaseConfigurationError } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 64 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return json({ received: false }, 413);
  }

  const dataId = request.nextUrl.searchParams.get('data.id')?.trim() ?? '';

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get('x-signature'),
      xRequestId: request.headers.get('x-request-id'),
      dataId,
      secret: getMercadoPagoWebhookSecret(),
      toleranceSeconds: 300,
    });
  } catch (error) {
    if (error instanceof MercadoPagoConfigurationError) return json({ received: false }, 503);
    if (error instanceof InvalidWebhookSignatureError) return json({ received: false }, 401);
    return json({ received: false }, 400);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ received: false }, 400);
  }

  if (!isRecord(payload) || !isRecord(payload.data)) return json({ received: false }, 400);

  const payloadDataId = String(payload.data.id ?? '').trim();
  if (!dataId || payloadDataId !== dataId || !isValidPaymentId(dataId)) {
    return json({ received: false }, 400);
  }

  const notificationType = String(
    payload.type ??
      request.nextUrl.searchParams.get('type') ??
      request.nextUrl.searchParams.get('topic') ??
      ''
  ).toLowerCase();

  // Checkout Pro payment notifications are the only events this endpoint
  // processes. Other correctly signed topics are acknowledged and ignored.
  if (notificationType !== 'payment') return json({ received: true });

  try {
    const payment = await fetchVerifiedPayment(dataId);
    if (!payment) return json({ received: true });

    const order = await recordVerifiedPayment(payment, 'payment_webhook');
    if (!order) return json({ received: false }, 409);
    if (payment.status === 'approved' && order.status === 'approved') {
      try {
        await processOrderApprovedNotifications(order.id);
      } catch {
        console.error('Order notification call failed.', {
          orderId: order.id,
          code: 'notification_call_error',
        });
      }
    }
    return json({ received: true });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError || error instanceof OrderPersistenceError) {
      return json({ received: false }, 503);
    }
    if (error instanceof MercadoPagoConfigurationError) return json({ received: false }, 503);
    // A provider read failure is retryable; do not acknowledge it as processed.
    return json({ received: false }, 502);
  }
}
