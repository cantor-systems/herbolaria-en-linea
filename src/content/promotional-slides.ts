export type PromotionalSlide = {
  id: string;
  campaign: 'featured-product' | 'promotion' | 'editorial' | 'launch';
  desktopImage: string;
  mobileImage?: string;
  imagePosition?: string;
  mobileImagePosition?: string;
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

// Existing catalogue artwork is authorized only as a Preview reference.
// Replace it with approved panoramic/mobile photography before production use.
export const PROMOTIONAL_SLIDES: readonly PromotionalSlide[] = [
  {
    id: 'moronel-featured', campaign: 'featured-product',
    desktopImage: '/images/products/moronel-gotas-50ml.webp',
    mobileImage: '/images/products/moronel-gotas-50ml.webp',
    imagePosition: '50% 66%', mobileImagePosition: '50% 50%',
    alt: 'Imagen de referencia del catálogo: presentación de gotas Moronel.',
    eyebrow: 'Producto destacado', headline: 'Descubre Moronel en línea',
    ctaText: 'Ver productos', href: '/tienda', order: 1, active: true, previewOnly: true,
  },
  {
    id: 'moronel-packages', campaign: 'promotion',
    desktopImage: '/images/products/moronel-paquete-integral.webp',
    mobileImage: '/images/products/moronel-paquete-integral.webp',
    imagePosition: '50% 64%', mobileImagePosition: '50% 50%',
    alt: 'Imagen de referencia del catálogo: conjunto de presentaciones Moronel.',
    eyebrow: 'Promociones', headline: 'Descubre nuestros paquetes',
    ctaText: 'Ver promociones', href: '/categoria/paquetes-y-promociones',
    order: 2, active: true, previewOnly: true,
  },
  {
    id: 'herbal-world', campaign: 'editorial',
    desktopImage: '/images/blog/moronel-usos-tradicionales.webp',
    mobileImage: '/images/blog/moronel-usos-tradicionales.webp',
    imagePosition: '50% 45%', mobileImagePosition: '50% 35%',
    alt: 'Imagen de referencia editorial: una rama de hojas verdes.',
    eyebrow: 'Conoce más', headline: 'Explora el mundo de la herbolaria',
    ctaText: 'Leer artículos', href: '/blog', order: 3, active: true, previewOnly: true,
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
