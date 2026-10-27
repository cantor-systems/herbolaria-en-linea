'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  clearDispatchAdminSession,
  createDispatchAdminSession,
  isDispatchAdminConfigured,
  isDispatchAdminPasswordValid,
  requireDispatchAdminSession,
} from '@/lib/dispatch/auth';
import {
  getApprovedDispatchOrder,
  getShippingEmailNotificationStatus,
  markWhatsAppShippingNotified,
} from '@/lib/dispatch/orders';
import { buildWhatsAppShippingUrl } from '@/lib/dispatch/whatsapp';
import { markOrderShipped } from '@/lib/orders/fulfillment';
import { processCustomerOrderShippedEmailNotification } from '@/lib/orders/notifications';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function validOrderId(formData: FormData) {
  const orderId = formString(formData, 'orderId');
  return UUID_PATTERN.test(orderId) ? orderId : null;
}

function validLabel(value: string, maximumLength: number) {
  return (
    value.length >= 1 &&
    value.length <= maximumLength &&
    !/[\u0000-\u001f\u007f<>]/.test(value)
  );
}

function validTrackingUrl(value: string) {
  if (value.length < 12 || value.length > 2048 || /[\s<>]/.test(value)) return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(
        url.hostname
      )
    );
  } catch {
    return false;
  }
}

function detailPath(orderId: string, result: string) {
  return `/operaciones/despacho/${orderId}?${result}`;
}

export async function loginDispatchAction(formData: FormData) {
  if (!isDispatchAdminConfigured()) {
    redirect('/operaciones/login?error=unavailable');
  }

  const submittedPassword = formData.get('password');
  const password = typeof submittedPassword === 'string' ? submittedPassword : '';

  if (!isDispatchAdminPasswordValid(password)) {
    redirect('/operaciones/login?error=invalid');
  }

  await createDispatchAdminSession();
  redirect('/operaciones/despacho');
}

export async function logoutDispatchAction() {
  await requireDispatchAdminSession();
  await clearDispatchAdminSession();
  redirect('/operaciones/login');
}

export async function markOrderShippedAction(formData: FormData) {
  await requireDispatchAdminSession();

  const orderId = validOrderId(formData);
  if (!orderId) redirect('/operaciones/despacho?error=invalid-order');

  const shippingCarrier = formString(formData, 'shippingCarrier');
  const trackingNumber = formString(formData, 'trackingNumber');
  const trackingUrl = formString(formData, 'trackingUrl');
  if (
    !validLabel(shippingCarrier, 100) ||
    !validLabel(trackingNumber, 120) ||
    !validTrackingUrl(trackingUrl)
  ) {
    redirect(detailPath(orderId, 'shipment=invalid'));
  }

  let order;
  try {
    order = await getApprovedDispatchOrder(orderId);
  } catch {
    console.error('Dispatch operation failed.', { orderId, operation: 'load_for_shipping' });
    redirect(detailPath(orderId, 'shipment=failed'));
  }
  if (!order) redirect(detailPath(orderId, 'shipment=unavailable'));

  if (
    order.fulfillmentStatus === 'shipped' &&
    (order.shippingCarrier !== shippingCarrier ||
      order.trackingNumber !== trackingNumber ||
      order.trackingUrl !== trackingUrl)
  ) {
    redirect(detailPath(orderId, 'shipment=conflict'));
  }

  try {
    await markOrderShipped({
      orderId,
      shippingCarrier,
      trackingNumber,
      trackingUrl,
    });
  } catch {
    console.error('Dispatch operation failed.', { orderId, operation: 'mark_shipped' });
    redirect(detailPath(orderId, 'shipment=failed'));
  }

  revalidatePath('/operaciones/despacho');
  revalidatePath(`/operaciones/despacho/${orderId}`);
  redirect(detailPath(orderId, 'shipment=sent'));
}

export async function retryShippingEmailAction(formData: FormData) {
  await requireDispatchAdminSession();

  const orderId = validOrderId(formData);
  if (!orderId) redirect('/operaciones/despacho?error=invalid-order');

  let order;
  try {
    order = await getApprovedDispatchOrder(orderId);
  } catch {
    console.error('Dispatch operation failed.', { orderId, operation: 'load_for_email' });
    redirect(detailPath(orderId, 'email=failed'));
  }
  if (!order || order.fulfillmentStatus !== 'shipped') {
    redirect(detailPath(orderId, 'email=unavailable'));
  }

  let outcome: 'sent' | 'already-sent' | 'pending' | 'failed' = 'failed';
  try {
    const result = await processCustomerOrderShippedEmailNotification(orderId);
    if (result === 'sent') {
      outcome = 'sent';
    } else if (result === 'failed') {
      outcome = 'failed';
    } else {
      const notification = await getShippingEmailNotificationStatus(orderId);
      outcome = notification?.status === 'sent' ? 'already-sent' : 'pending';
    }
  } catch {
    console.error('Dispatch operation failed.', { orderId, operation: 'retry_email' });
    outcome = 'failed';
  }

  revalidatePath(`/operaciones/despacho/${orderId}`);
  redirect(detailPath(orderId, `email=${outcome}`));
}

export async function confirmWhatsAppSentAction(formData: FormData) {
  await requireDispatchAdminSession();

  const orderId = validOrderId(formData);
  if (!orderId) redirect('/operaciones/despacho?error=invalid-order');

  let order;
  try {
    order = await getApprovedDispatchOrder(orderId);
  } catch {
    console.error('Dispatch operation failed.', {
      orderId,
      operation: 'load_for_whatsapp',
    });
    redirect(detailPath(orderId, 'whatsapp=failed'));
  }
  if (
    !order ||
    order.fulfillmentStatus !== 'shipped' ||
    !order.whatsappNotificationsOptIn ||
    !buildWhatsAppShippingUrl(order)
  ) {
    redirect(detailPath(orderId, 'whatsapp=failed'));
  }

  try {
    await markWhatsAppShippingNotified(orderId);
  } catch {
    console.error('Dispatch operation failed.', {
      orderId,
      operation: 'confirm_whatsapp',
    });
    redirect(detailPath(orderId, 'whatsapp=failed'));
  }

  revalidatePath(`/operaciones/despacho/${orderId}`);
  redirect(detailPath(orderId, 'whatsapp=confirmed'));
}
