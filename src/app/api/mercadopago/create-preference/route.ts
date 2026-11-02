import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { Preference } from 'mercadopago';
import { absoluteUrl, SITE_URL } from '@/lib/site';
import {
  CheckoutValidationError,
  priceCheckoutCart,
  type PricedCheckoutCart,
} from '@/lib/checkout/serverPricing';
import {
  createMercadoPagoClient,
  MercadoPagoConfigurationError,
} from '@/lib/mercadopago/client';
import {
  createPreferenceExpirationPolicy,
  decidePreferenceAction,
} from '@/lib/mercadopago/preferencePolicy';
import {
  CheckoutPreferenceExpiredError,
  CheckoutPreferenceProviderError,
  CheckoutPreferenceRecoveryConflictError,
  CheckoutPreferenceRecoveryPendingError,
  resolveCheckoutPreference,
} from '@/lib/mercadopago/preferenceLifecycle';
import {
  attachPreferenceToOrder,
  claimPreferenceCreation,
  createPendingOrder,
  OrderPersistenceError,
  recordPreferenceFailure,
} from '@/lib/orders/repository';
import { SupabaseConfigurationError } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const MAX_REQUEST_BYTES = 64 * 1024;
const CHECKOUT_ATTEMPT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface CheckoutBuyer {
  email: string;
  phone: string;
  fullName: string;
  streetAddress: string;
  colonia: string;
  city: string;
  state: string;
  postalCode: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, minimum: number, maximum: number) {
  if (typeof value !== 'string') throw new CheckoutValidationError('Los datos del comprador no son válidos.');
  const cleanValue = value.trim();
  if (cleanValue.length < minimum || cleanValue.length > maximum) {
    throw new CheckoutValidationError('Los datos del comprador no son válidos.');
  }
  return cleanValue;
}

function validateBuyer(input: unknown): CheckoutBuyer {
  if (!isRecord(input)) throw new CheckoutValidationError('Los datos del comprador no son válidos.');

  const allowedKeys = [
    'email',
    'phone',
    'fullName',
    'streetAddress',
    'colonia',
    'city',
    'state',
    'postalCode',
  ];
  if (Object.keys(input).some((key) => !allowedKeys.includes(key))) {
    throw new CheckoutValidationError('Los datos del comprador contienen campos no permitidos.');
  }

  const email = cleanText(input.email, 5, 150).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CheckoutValidationError('El correo electrónico no es válido.');
  }

  const phone = cleanText(input.phone, 10, 30).replace(/\D/g, '');
  if (phone.length < 10 || phone.length > 15) {
    throw new CheckoutValidationError('El teléfono no es válido.');
  }

  const postalCode = cleanText(input.postalCode, 5, 5);
  if (!/^\d{5}$/.test(postalCode)) {
    throw new CheckoutValidationError('El código postal no es válido.');
  }

  return {
    email,
    phone,
    fullName: cleanText(input.fullName, 2, 120),
    streetAddress: cleanText(input.streetAddress, 3, 160),
    colonia: cleanText(input.colonia, 2, 100),
    city: cleanText(input.city, 2, 100),
    state: cleanText(input.state, 2, 100),
    postalCode,
  };
}

function checkoutAttemptId(request: Request) {
  const value = request.headers.get('idempotency-key')?.trim();
  if (!value) return randomUUID();
  if (!CHECKOUT_ATTEMPT_PATTERN.test(value)) {
    throw new CheckoutValidationError('La clave de reintento no es válida.');
  }
  return value;
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function mercadoPagoItems(cart: PricedCheckoutCart) {
  if (cart.discountCents === 0) {
    return cart.items.map((item) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unitPriceCents / 100,
      currency_id: 'MXN',
    }));
  }

  const discountableSubtotalCents =
    cart.wholesaleDiscountPercent > 0
      ? cart.wholesaleEligibleSubtotalCents
      : cart.subtotalCents;
  let cumulativeDiscountableSubtotalCents = 0;
  let cumulativeDiscountCents = 0;

  const discountedItems = cart.items.map((item) => {
    const lineTotalCents = item.unitPriceCents * item.quantity;
    const lineReceivesDiscount =
      cart.wholesaleDiscountPercent === 0 || item.wholesaleEligible;
    if (lineReceivesDiscount) {
      cumulativeDiscountableSubtotalCents += lineTotalCents;
    }

    // Checkout Pro has no seller-defined discount amount on a preference.
    // Aggregate each cart line at quantity 1 and distribute the authoritative
    // discount proportionally across eligible lines so the merchandise sum is exact.
    const targetCumulativeDiscountCents = Number(
      (BigInt(cumulativeDiscountableSubtotalCents) * BigInt(cart.discountCents) +
        BigInt(discountableSubtotalCents) / 2n) /
        BigInt(discountableSubtotalCents)
    );
    const lineDiscountCents =
      targetCumulativeDiscountCents - cumulativeDiscountCents;
    cumulativeDiscountCents = targetCumulativeDiscountCents;
    const netLineTotalCents = lineTotalCents - lineDiscountCents;

    if (!Number.isSafeInteger(netLineTotalCents) || netLineTotalCents <= 0) {
      throw new CheckoutValidationError('El total con descuento no es válido.');
    }

    return {
      id: item.id,
      title: `${item.title} × ${item.quantity}`.slice(0, 256),
      quantity: 1,
      unit_price: netLineTotalCents / 100,
      currency_id: 'MXN',
    };
  });

  if (cumulativeDiscountCents !== cart.discountCents) {
    throw new CheckoutValidationError('El descuento no pudo distribuirse correctamente.');
  }

  return discountedItems;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return json({ error: 'La solicitud es demasiado grande.' }, 413);
  }

  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return json({ error: 'El formato de la solicitud no es válido.' }, 415);
  }

  try {
    const siteUrl = new URL(SITE_URL);
    if (siteUrl.protocol !== 'https:') {
      throw new MercadoPagoConfigurationError('NEXT_PUBLIC_SITE_URL debe usar HTTPS.');
    }

    const payload: unknown = await request.json();
    if (
      !isRecord(payload) ||
      Object.keys(payload).some(
        (key) =>
          ![
            'items',
            'buyer',
            'shippingMethod',
            'promotionCode',
            'whatsappNotificationsOptIn',
          ].includes(key)
      ) ||
      typeof payload.whatsappNotificationsOptIn !== 'boolean'
    ) {
      throw new CheckoutValidationError('La solicitud contiene campos no permitidos.');
    }

    const cart = priceCheckoutCart(
      payload.items,
      payload.shippingMethod,
      payload.promotionCode
    );
    const buyer = validateBuyer(payload.buyer);
    const requestedExternalReference = `order_${randomUUID()}`;
    const order = await createPendingOrder({
      checkoutAttemptId: checkoutAttemptId(request),
      externalReference: requestedExternalReference,
      currency: 'MXN',
      subtotalCents: cart.subtotalCents,
      promotionCode: cart.promotionCode,
      discountCents: cart.discountCents,
      shippingMethod: cart.shippingMethod,
      shippingCents: cart.shippingCents,
      totalCents: cart.totalCents,
      customerEmail: buyer.email,
      customerName: buyer.fullName,
      customerPhone: buyer.phone,
      whatsappNotificationsOptIn: payload.whatsappNotificationsOptIn,
      shippingAddress: {
        streetAddress: buyer.streetAddress,
        colonia: buyer.colonia,
        city: buyer.city,
        state: buyer.state,
        postalCode: buyer.postalCode,
        country: 'México',
      },
      items: cart.items.map((item) => ({
        productSlug: item.slug,
        productName: item.productName,
        variantId: item.variantId,
        variantLabel: item.variantLabel,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.unitPriceCents * item.quantity,
      })),
    });
    const externalReference = order.externalReference;
    const streetName = `${buyer.streetAddress}, ${buyer.colonia}`;
    const preferenceItems = mercadoPagoItems(cart);
    const expirationPolicy = createPreferenceExpirationPolicy(order.createdAt);
    const preferenceAction = decidePreferenceAction({
      preferenceId: order.mercadoPagoPreferenceId,
      storedExpiresAt: order.mercadoPagoPreferenceExpiresAt,
      prospectiveExpiresAt: expirationPolicy.expiresAt,
    });

    if (preferenceAction === 'expired') {
      return json(
        {
          code: 'checkout_preference_expired',
          error:
            'La sesión de pago venció. Revisa el carrito actualizado antes de confirmar una nueva compra.',
        },
        409
      );
    }

    const preferenceClient = new Preference(createMercadoPagoClient());
    const preferenceResult = await resolveCheckoutPreference({
      action: preferenceAction,
      preferenceId: order.mercadoPagoPreferenceId,
      preferenceErrorCode: order.preferenceErrorCode,
      expected: {
        externalReference,
        currency: order.currency,
        totalCents: order.totalCents,
        items: preferenceItems,
        shippingCents: order.shippingCents,
        validFrom: expirationPolicy.validFrom,
        expiresAt: expirationPolicy.expiresAt,
        offlineExpiresAt: expirationPolicy.offlinePaymentExpiresAt,
      },
      provider: {
        create: () =>
          preferenceClient.create({
            body: {
              items: preferenceItems,
              payer: {
                email: buyer.email,
                name: buyer.fullName,
                phone: { number: buyer.phone },
                address: {
                  zip_code: buyer.postalCode,
                  street_name: streetName,
                },
              },
              shipments: {
                cost: cart.shippingCents / 100,
                mode: 'not_specified',
                free_shipping: cart.shippingCents === 0,
                receiver_address: {
                  zip_code: buyer.postalCode,
                  street_name: streetName,
                  city_name: buyer.city,
                  state_name: buyer.state,
                  country_name: 'México',
                },
              },
              external_reference: externalReference,
              metadata: {
                order_id: externalReference,
                expected_total_cents: cart.totalCents,
              },
              back_urls: {
                success: absoluteUrl('/pedido/confirmacion?status=success'),
                pending: absoluteUrl('/pedido/confirmacion?status=pending'),
                failure: absoluteUrl('/checkout?payment=failed'),
              },
              auto_return: 'approved',
              notification_url: absoluteUrl(
                '/api/mercadopago/webhook?source_news=webhooks'
              ),
              expires: true,
              expiration_date_from: expirationPolicy.validFrom,
              expiration_date_to: expirationPolicy.expiresAt,
              date_of_expiration: expirationPolicy.offlinePaymentExpiresAt,
            },
            requestOptions: { idempotencyKey: externalReference },
          }),
        get: (preferenceId) => preferenceClient.get({ preferenceId }),
        searchByExternalReference: (reference) =>
          preferenceClient.search({
            options: { external_reference: reference, limit: 50, offset: 0 },
          }),
      },
      persistence: {
        claimCreation: async (reference) => Boolean(await claimPreferenceCreation(reference)),
        attach: async (preferenceId) =>
          Boolean(
            await attachPreferenceToOrder(externalReference, preferenceId, {
              preferenceExpiresAt: expirationPolicy.expiresAt,
              offlineExpiresAt: expirationPolicy.offlinePaymentExpiresAt,
              orderPurpose: 'commercial',
            })
          ),
        recordFailure: (errorCode) =>
          recordPreferenceFailure(externalReference, errorCode),
      },
    });

    return json({
      preferenceId: preferenceResult.preferenceId,
      externalReference,
      checkoutUrl: preferenceResult.checkoutUrl,
    });
  } catch (error) {
    if (error instanceof CheckoutValidationError) return json({ error: error.message }, 400);
    if (error instanceof SupabaseConfigurationError) {
      return json({ error: 'La persistencia de pedidos no está configurada.' }, 503);
    }
    if (error instanceof OrderPersistenceError) {
      return json({ error: 'No fue posible guardar el pedido.' }, 503);
    }
    if (error instanceof MercadoPagoConfigurationError) {
      return json({ error: 'Mercado Pago no está configurado.' }, 503);
    }
    if (error instanceof CheckoutPreferenceExpiredError) {
      return json(
        {
          code: 'checkout_preference_expired',
          error:
            'La sesión de pago venció. Revisa el carrito actualizado antes de confirmar una nueva compra.',
        },
        409
      );
    }
    if (error instanceof CheckoutPreferenceRecoveryPendingError) {
      return json(
        {
          code: 'checkout_preference_recovery_pending',
          error:
            'No fue posible confirmar todavía la sesión de pago. Intenta nuevamente más tarde.',
        },
        503
      );
    }
    if (error instanceof CheckoutPreferenceRecoveryConflictError) {
      return json(
        {
          code: 'checkout_preference_recovery_conflict',
          error: 'La sesión de pago requiere revisión antes de continuar.',
        },
        409
      );
    }
    if (error instanceof CheckoutPreferenceProviderError) {
      return json(
        {
          code: 'checkout_preference_provider_error',
          error: 'Mercado Pago no pudo procesar la sesión de pago.',
        },
        502
      );
    }
    if (error instanceof SyntaxError) return json({ error: 'El contenido de la solicitud no es válido.' }, 400);
    return json({ error: 'No fue posible crear la preferencia de pago.' }, 502);
  }
}
