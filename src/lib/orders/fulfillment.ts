import 'server-only';

import { processCustomerOrderShippedEmailNotification } from '@/lib/orders/notifications';
import { persistOrderShipment } from '@/lib/orders/repository';
import type { MarkOrderShippedInput } from '@/lib/orders/types';

export async function markOrderShipped(input: MarkOrderShippedInput) {
  const order = await persistOrderShipment(input);

  try {
    await processCustomerOrderShippedEmailNotification(order.id);
  } catch {
    console.error('Shipment notification call failed.', {
      orderId: order.id,
      code: 'shipment_notification_call_error',
    });
  }

  return order;
}
