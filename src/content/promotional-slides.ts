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
  details?: readonly string[];
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
    id: 'buen-fin-2026', campaign: 'promotion',
    desktopImage: '/images/banners/bf20-desktop.webp', mobileImage: '/images/banners/bf20-mobile.webp',
    copyPosition: 'right', alt: 'Productos Herbazen en gotas, cápsulas y té sobre piedra natural.',
    eyebrow: 'BUEN FIN 2026', headline: '20% de descuento',
    details: ['Usa el cupón BF20', 'Del 12 al 17 de noviembre', 'Compra mínima de $799 MXN', '3 MSI con tarjeta de crédito'],
    ctaText: 'Ver promociones', href: '/tienda', order: 1, active: true, previewOnly: false,
    startsAt: '2026-11-12T00:00:00-06:00', endsAt: '2026-11-18T00:00:00-06:00',
  },
  {
    id: 'moronel-featured', campaign: 'featured-product',
    desktopImage: '/images/banners/moronel-linea-desktop-v2.webp',
    mobileImage: '/images/banners/moronel-linea-mobile-v2.webp',
    imagePosition: '50% 55%', mobileImagePosition: '0% 50%', copyPosition: 'right',
    alt: 'Presentaciones de Moronel Herbazen en gotas, cápsulas y té sobre una superficie de piedra.',
    eyebrow: 'Producto destacado', headline: 'Descubre Moronel en línea',
    ctaText: 'Ver productos', href: '/tienda', order: 2, active: true, previewOnly: false,
  },
  {
    id: 'moronel-packages', campaign: 'promotion',
    desktopImage: '/images/banners/promociones-desktop-v2.webp',
    mobileImage: '/images/banners/promociones-mobile-v2.webp',
    imagePosition: '50% 50%', mobileImagePosition: '50% 50%',
    alt: 'Productos Herbazen de Moronel en gotas, cápsulas y té, extractos herbales y una taza de infusión sobre piedra.',
    eyebrow: 'Promociones', headline: 'Descubre nuestros paquetes',
    ctaText: 'Ver promociones', href: '/categoria/paquetes-y-promociones',
    order: 3, active: true, previewOnly: false,
  },
  {
    id: 'herbal-world', campaign: 'editorial',
    desktopImage: '/images/banners/herbolaria-desktop-v2.webp',
    mobileImage: '/images/banners/herbolaria-mobile-v2.webp',
    imagePosition: '50% 50%', mobileImagePosition: '15% 50%', copyPosition: 'right',
    alt: 'Extractos herbales Herbazen en frascos goteros, con cúrcuma, propóleo e ingredientes naturales sobre piedra.',
    eyebrow: 'Conoce más', headline: 'Explora el mundo de la herbolaria',
    ctaText: 'Leer artículos', href: '/blog', order: 4, active: true, previewOnly: false,
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
