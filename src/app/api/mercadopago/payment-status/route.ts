import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfigurationError } from '@/lib/mercadopago/client';
import {
  fetchVerifiedPayment,
  isValidOrderReference,
  isValidPaymentId,
} from '@/lib/mercadopago/paymentVerification';
import { processOrderApprovedNotifications } from '@/lib/orders/notifications';
import { OrderPersistenceError, recordVerifiedPayment } from '@/lib/orders/repository';
import { SupabaseConfigurationError } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get('payment_id')?.trim() ?? '';
  const externalReference = request.nextUrl.searchParams.get('external_reference')?.trim() ?? '';

  if (!isValidPaymentId(paymentId) || !isValidOrderReference(externalReference)) {
    return json({ error: 'No fue posible verificar el pago.' }, 400);
  }

  try {
    const payment = await fetchVerifiedPayment(paymentId, externalReference);
    if (!payment) return json({ error: 'No fue posible verificar el pago.' }, 404);
    const order = await recordVerifiedPayment(payment, 'payment_status');
    if (!order) return json({ error: 'No fue posible verificar el pago.' }, 404);
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

    return json({
      status: payment.status,
      verifiedByProvider: true,
      publicOrderNumber: order.publicOrderNumber,
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError || error instanceof OrderPersistenceError) {
      return json({ error: 'No fue posible verificar el pago.' }, 503);
    }
    if (error instanceof MercadoPagoConfigurationError) {
      return json({ error: 'Mercado Pago no está configurado.' }, 503);
    }
    return json({ error: 'No fue posible verificar el pago.' }, 502);
  }
}
