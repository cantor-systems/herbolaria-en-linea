'use client';

type AnalyticsValue = string | number;

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_variant?: string;
};

type EventParameters = Record<string, AnalyticsValue | AnalyticsItem[]>;

declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, parameters?: EventParameters) => void;
    clarity?: (command: 'event', eventName: string) => void;
  }
}

function trackGaEvent(eventName: string, parameters: EventParameters) {
  if (typeof window !== 'undefined') {
    window.gtag?.('event', eventName, parameters);
  }
}

function trackClarityEvent(eventName: string) {
  if (typeof window !== 'undefined') {
    window.clarity?.('event', eventName);
  }
}

export function trackViewItem(item: AnalyticsItem) {
  trackGaEvent('view_item', { currency: 'MXN', value: item.price, items: [item] });
}

export function trackAddToCart(item: AnalyticsItem) {
  trackGaEvent('add_to_cart', { currency: 'MXN', value: item.price * item.quantity, items: [item] });
  trackClarityEvent('add_to_cart');
}

export function trackBeginCheckout(items: AnalyticsItem[], value: number) {
  trackGaEvent('begin_checkout', { currency: 'MXN', value, items });
  trackClarityEvent('begin_checkout');
}

export function trackWhatsAppClick(
  source: string,
  options: { productSlug?: string; placement?: string } = {}
) {
  trackGaEvent('click_whatsapp', {
    source,
    ...(options.productSlug ? { product_slug: options.productSlug } : {}),
    ...(options.placement ? { placement: options.placement } : {}),
  });
  trackClarityEvent('click_whatsapp');
}
