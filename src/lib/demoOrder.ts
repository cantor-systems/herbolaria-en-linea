export interface DemoOrder {
  orderNumber: string;
  status: 'pending_payment';
  createdAt: string;
  totalCents: number;
}

const getDemoOrderStorageKey = (orderNumber: string) => `moronel_demo_order_${orderNumber}`;

export const saveDemoOrder = (order: DemoOrder) => {
  localStorage.setItem(getDemoOrderStorageKey(order.orderNumber), JSON.stringify(order));
};

export const getDemoOrder = (orderNumber: string) => {
  const storedOrder = localStorage.getItem(getDemoOrderStorageKey(orderNumber));
  if (!storedOrder) return null;

  try {
    return JSON.parse(storedOrder) as DemoOrder;
  } catch {
    return null;
  }
};
