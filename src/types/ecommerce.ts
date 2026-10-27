export type UserRole = 'owner' | 'admin' | 'seller' | 'customer';

export interface StoreConfig {
  storeName: string;
  brandName: string;
  domain: string;
  slogan: string;
  description: string;
  logo: {
    text: string;
    tagline: string;
    icon: string;
  };
  colors: {
    deepGreen: string;
    sageGreen: string;
    warmCream: string;
    sand: string;
    terracotta: string;
    softMustard: string;
  };
  contact: {
    whatsappNumber: string;
    whatsappFormatted: string;
    phone: string;
    email: string;
    address: string;
    businessHours: string;
  };
  shippingMessages: {
    freeShippingThreshold: number;
    freeShippingText: string;
    deliveryTimeText: string;
    guaranteeText: string;
  };
  socialLinks: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
  };
}

export interface Brand {
  id: string;
  name: string;
  logo?: string;
  description: string;
  website?: string;
}

export interface Vendor {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  status: 'active' | 'inactive';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount?: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string; // e.g. "1 Bolsa (240 Gramos)", "3 Bolsas", "5 Bolsas"
  sku: string;
  price: number;
  compareAtPrice?: number;
  pricePerUnit?: string; // e.g. "$249.00 / unidad"
  stock: number;
  unitCount: number;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brandId: string;
  brandName: string;
  vendorId: string;
  categoryId: string;
  categoryName: string;
  shortDescription: string;
  description: string;
  content: string; // Presentación y contenido neto
  usageInstructions: string; // Modo de empleo
  ingredients: string; // Ingredientes naturales
  importantNotice: string; // Aviso herbolario responsable
  images: string[];
  isFeatured: boolean;
  isBundle: boolean; // Distingue paquetes/bundles de variantes
  rating: number;
  reviewCount: number;
  tags: string[];
  variants: ProductVariant[];
  createdAt: string;
}

export interface CustomerAddress {
  id: string;
  fullName: string;
  street: string;
  exteriorNo: string;
  interiorNo?: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  addresses: CustomerAddress[];
  acceptMarketingWhatsApp: boolean;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
}

export interface CartItem {
  id: string;
  product: Product;
  variant: ProductVariant;
  quantity: number;
  unitPrice: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  shippingFee: number;
  total: number;
}

export type CommissionStatus = 'pending' | 'approved' | 'payable' | 'paid' | 'reversed';

export interface Seller {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  commissionRate: number; // e.g. 0.10 for 10%
  totalSales: number;
  totalCommissions: number;
  status: 'active' | 'inactive';
}

export interface CommissionPlan {
  id: string;
  name: string;
  percentage: number;
  appliesToCategories: string[];
}

export interface OrderCommission {
  id: string;
  orderId: string;
  sellerId: string;
  sellerName: string;
  subtotalEligible: number; // subtotal minus discounts, without shipping
  rate: number;
  amount: number; // calculated as subtotalEligible * rate
  status: CommissionStatus;
  createdAt: string;
  paidAt?: string;
}

export type PaymentMethod = 'mercadopago_card' | 'mercadopago_spei' | 'mercadopago_oxxo' | 'whatsapp_direct';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  provider: 'mercadopago' | 'whatsapp' | 'bank_transfer';
  transactionId: string;
  createdAt: string;
}

export type ShipmentStatus = 'preparing' | 'in_transit' | 'out_for_delivery' | 'delivered';

export interface Shipment {
  id: string;
  orderId: string;
  trackingNumber: string;
  carrier: string; // e.g. "Estafeta", "FedEx", "DHL"
  status: ShipmentStatus;
  estimatedDeliveryDate: string;
  trackingUrl: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  customer: {
    id?: string;
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: CustomerAddress;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shipment?: Shipment;
  sellerId?: string;
  sellerName?: string;
  commission?: OrderCommission;
  marketingConsentWhatsApp: boolean;
  notes?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  date: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'inventory' | 'commission' | 'system';
  date: string;
  read: boolean;
}

export interface MarketingConsent {
  whatsapp: boolean;
  email: boolean;
  acceptedAt?: string;
}
