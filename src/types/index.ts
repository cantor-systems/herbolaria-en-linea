export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProductVariant {
  id: string;
  name: string; // e.g. "1 Unidad", "3 Unidades (15% OFF)", "5 Unidades (25% OFF)"
  unitsCount: number;
  priceCents: number;
  compareAtPriceCents?: number;
  unitPriceCents: number; // calculated price per unit/bag
  image?: string;
  badge?: string;
  isPopular?: boolean;
  freeShippingEligible: boolean;
}

export interface ProductClaim {
  text: string;
  approved: boolean;
  visible: boolean;
  requiresValidation: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string; // "Herbazen"
  categorySlug: string;
  categoryName: string;
  shortDescription: string;
  description: string;
  images: string[];
  priceCents: number;
  compareAtPriceCents?: number;
  currency: 'MXN';
  stockStatus: StockStatus;
  variants: ProductVariant[];
  rating: number;
  reviewCount: number;
  badges: string[];
  claims?: ProductClaim[];
  featured: boolean;
  status: 'active' | 'draft';
  ingredients?: string[];
  usageInstructions?: string;
  contentVolume?: string;
  benefits?: string[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  badge?: string;
  productCount: number;
}

export interface Testimonial {
  id: string;
  authorName: string;
  location: string;
  verifiedPurchase: boolean;
  rating: number;
  productName: string;
  comment: string;
  date: string;
  isMock: boolean;
  isVerified: boolean;
  requiresValidation: boolean;
}

export interface RatingBreakdown {
  averageRating: number;
  totalReviews: number;
  fiveStarPercentage: number;
  fourStarPercentage: number;
  threeStarPercentage: number;
  twoStarPercentage: number;
  oneStarPercentage: number;
  isMock: boolean;
  requiresValidation: boolean;
}

export interface Promotion {
  code: string;
  label: string;
  type: 'percentage' | 'fixed_amount';
  value: number; // e.g. 10 for 10% or 10000 for $100.00 MXN
  minimumSubtotalCents: number;
  enabled: boolean;
  startsAt?: string;
  endsAt?: string;
  timeZone: string;
  isMock: boolean;
  requiresValidation: boolean;
  description: string;
}

export type ClaimType =
  | 'ingredient'
  | 'presentation'
  | 'traditional_use'
  | 'preparation'
  | 'warning'
  | 'general_information';

export interface SanitaryClaim {
  id: string;
  productId?: string;
  title: string;
  body: string;
  type: ClaimType;
  approved: boolean;
  requiresLegalReview: boolean;
  requiresRegulatoryReview: boolean;
  source?: string;
  visible: boolean;
}

export interface CartItem {
  id: string; // unique item id (productId + variantId)
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export interface StoreConfig {
  storeName: string;
  brandName: string; // "Herbazen"
  tagline: string;
  description: string;
  contact: {
    whatsapp: { value: string | null; enabled: boolean };
    email: { value: string | null; enabled: boolean };
    businessHours: { value: string | null; enabled: boolean };
    location: { value: string | null; enabled: boolean };
  };
  payments: {
    paymentsEnabled: boolean;
    paymentProvider: string | null;
    paymentMode: 'demo' | 'live';
  };
  logo: {
    text: string;
    tagline: string;
  };
}

export interface ShippingConfig {
  coverage: string;
  freeShippingThresholdCents: number;
  standardShippingCents: number;
  expressShippingCents: number;
  expressUpgradeCents: number;
  currency: 'MXN';
  enabled: boolean;
  standardEstimatedDays: string;
  expressEstimatedDays: string;
  couriers: string[];
  trackingAvailable: boolean;
  isMock: boolean;
  requiresValidation: boolean;
  disclaimer: string;
}

export interface SocialConfig {
  id: string;
  platform: string;
  label: string;
  href: string | null;
  enabled: boolean;
  isPlaceholder: boolean;
}
