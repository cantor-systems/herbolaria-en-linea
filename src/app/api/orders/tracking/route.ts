import { NextResponse } from 'next/server';
import {
  findPublicOrderTracking,
  OrderTrackingLookupError,
} from '@/lib/orders/tracking';
import { SupabaseConfigurationError } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 8 * 1024;
const ORDER_NUMBER_PATTERN = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class TrackingValidationError extends Error {}
class TrackingBodyTooLargeError extends Error {}

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readLimitedBody(request: Request) {
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_REQUEST_BYTES) {
      try {
        await reader.cancel();
      } catch {
        // The size limit still applies if the stream cannot be cancelled cleanly.
      }
      throw new TrackingBodyTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(body);
  } catch {
    throw new TrackingValidationError();
  }
}

function validatePayload(input: unknown) {
  if (!isRecord(input)) throw new TrackingValidationError();

  const keys = Object.keys(input);
  if (
    keys.length !== 2 ||
    !keys.includes('orderNumber') ||
    !keys.includes('email') ||
    typeof input.orderNumber !== 'string' ||
    typeof input.email !== 'string'
  ) {
    throw new TrackingValidationError();
  }

  const orderNumber = input.orderNumber.trim().toUpperCase();
  const email = input.email.trim().toLowerCase();

  if (
    orderNumber.length !== 6 ||
    !ORDER_NUMBER_PATTERN.test(orderNumber) ||
    email.length < 3 ||
    email.length > 150 ||
    !EMAIL_PATTERN.test(email)
  ) {
    throw new TrackingValidationError();
  }

  return { orderNumber, email };
}

export async function POST(request: Request) {
  const contentType = request.headers
    .get('content-type')
    ?.split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== 'application/json') {
    return json({ error: 'El formato de la solicitud no es válido.' }, 415);
  }

  const contentLengthHeader = request.headers.get('content-length');
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return json({ error: 'La solicitud es demasiado grande.' }, 413);
  }

  try {
    const rawBody = await readLimitedBody(request);
    const payload: unknown = JSON.parse(rawBody);
    const { orderNumber, email } = validatePayload(payload);
    const tracking = await findPublicOrderTracking(orderNumber, email);

    if (!tracking) {
      return json({ error: 'No encontramos un pedido con esos datos.' }, 404);
    }

    return json(tracking);
  } catch (error) {
    if (error instanceof TrackingBodyTooLargeError) {
      return json({ error: 'La solicitud es demasiado grande.' }, 413);
    }
    if (
      error instanceof TrackingValidationError ||
      error instanceof SyntaxError
    ) {
      return json({ error: 'Los datos de consulta no son válidos.' }, 400);
    }
    if (
      error instanceof OrderTrackingLookupError ||
      error instanceof SupabaseConfigurationError
    ) {
      return json({ error: 'No fue posible consultar el pedido.' }, 503);
    }
    return json({ error: 'No fue posible consultar el pedido.' }, 500);
  }
}

export function GET() {
  return json({ error: 'Método no permitido.' }, 405, { Allow: 'POST' });
}
