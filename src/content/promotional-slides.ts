export type PromotionalSlide = {
  id: string;
  campaign: 'featured-product' | 'promotion' | 'editorial' | 'launch';
  desktopImage: string;
  mobileImage?: string;
  imagePosition?: string;
  mobileImagePosition?: string;
  copyPosition?: 'left' | 'right';
  alt: string;
  eyebrow: string;
  headline: string;
  ctaText: string;
  href: `/${string}`;
  order: number;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  /** Unapproved photography must never appear in a production banner. */
  previewOnly: boolean;
};

// Owner-supplied provisional panoramas, approved for Production on 2026-11-06.
// Preserve the approved desktop/mobile framing; future unapproved imagery must
// remain Preview-only.
export const PROMOTIONAL_SLIDES: readonly PromotionalSlide[] = [
  {
    id: 'moronel-featured', campaign: 'featured-product',
    desktopImage: '/images/banners/featured-product.webp',
    mobileImage: '/images/banners/featured-product.webp',
    imagePosition: '50% 55%', mobileImagePosition: '0% 50%', copyPosition: 'right',
    alt: 'Frasco ámbar con gotero junto a flores sobre una superficie de madera.',
    eyebrow: 'Producto destacado', headline: 'Descubre Moronel en línea',
    ctaText: 'Ver productos', href: '/tienda', order: 1, active: true, previewOnly: false,
  },
  {
    id: 'moronel-packages', campaign: 'promotion',
    desktopImage: '/images/banners/packages.webp',
    mobileImage: '/images/banners/packages.webp',
    imagePosition: '50% 50%', mobileImagePosition: '50% 50%',
    alt: 'Frascos ámbar, hierbas secas, una taza de infusión y un paquete sobre una mesa.',
    eyebrow: 'Promociones', headline: 'Descubre nuestros paquetes',
    ctaText: 'Ver promociones', href: '/categoria/paquetes-y-promociones',
    order: 2, active: true, previewOnly: false,
  },
  {
    id: 'herbal-world', campaign: 'editorial',
    desktopImage: '/images/banners/herbal-editorial.webp',
    mobileImage: '/images/banners/herbal-editorial.webp',
    imagePosition: '50% 50%', mobileImagePosition: '15% 50%', copyPosition: 'right',
    alt: 'Detalle de hojas de una planta con un fondo natural desenfocado.',
    eyebrow: 'Conoce más', headline: 'Explora el mundo de la herbolaria',
    ctaText: 'Leer artículos', href: '/blog', order: 3, active: true, previewOnly: false,
  },
];

export function selectPromotionalSlides(
  slides: readonly PromotionalSlide[],
  { now = Date.now(), allowPreview = false }: { now?: number; allowPreview?: boolean } = {},
): PromotionalSlide[] {
  return slides.filter((slide) => {
    if (!slide.active || (slide.previewOnly && !allowPreview)) return false;
    const start = slide.startsAt === undefined ? -Infinity : Date.parse(slide.startsAt);
    const end = slide.endsAt === undefined ? Infinity : Date.parse(slide.endsAt);
    return !Number.isNaN(start) && !Number.isNaN(end) && start < end && start <= now && now < end;
  }).sort((a, b) => a.order - b.order);
}

export function allowPromotionalPreview(nodeEnv?: string, vercelEnv?: string): boolean {
  // A Preview override cannot enable placeholder banners in Vercel Production.
  return vercelEnv === 'preview' || (nodeEnv === 'development' && !vercelEnv);
}
