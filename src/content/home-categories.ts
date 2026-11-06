// Home-only copy. Shared category descriptions also feed internal pages and SEO.
export interface HomeCategoryCardCopy {
  readonly microLabel: string;
  readonly description: string;
  readonly ctaText: string;
}

export const HOME_CATEGORY_SECTION = {
  eyebrow: 'Explora nuestra herbolaria',
  title: 'Encuentra la presentación ideal para ti',
  subtitle:
    'Explora nuestra selección de plantas medicinales, extractos y suplementos herbolarios. Elige cómo prefieres disfrutar de la herbolaria.',
} as const;

// Stable category IDs, independent of display names, slugs or array positions.
export const HOME_CATEGORY_CARDS: Readonly<Record<string, HomeCategoryCardCopy>> = {
  'cat-extractos-gotas': {
    microLabel: 'Extractos botánicos',
    description: 'Explora extractos herbolarios en presentación líquida, con frascos goteros para una dosificación práctica.',
    ctaText: 'Ver extractos',
  },
  'cat-capsulas': {
    microLabel: 'Suplementos herbolarios',
    description: 'Descubre suplementos herbolarios encapsulados, en presentaciones prácticas para incorporar a tu rutina.',
    ctaText: 'Ver cápsulas',
  },
  'cat-hierbas-infusiones': {
    microLabel: 'Tradición herbolaria',
    description: 'Conoce nuestra selección de plantas y hierbas deshidratadas para infusiones y preparaciones tradicionales.',
    ctaText: 'Explorar hierbas',
  },
  'cat-paquetes': {
    microLabel: 'Compra más en conjunto',
    description: 'Explora paquetes con distintas presentaciones y descubre las promociones disponibles en nuestra tienda.',
    ctaText: 'Ver promociones',
  },
};
