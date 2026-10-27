export const SITE_NAME = 'Moronel Planta de la Vida';

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
const defaultSiteUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://www.moronelplantadelavida.com'
    : 'http://localhost:3000';

export const SITE_URL = configuredSiteUrl || defaultSiteUrl;
export const metadataBase = new URL(SITE_URL);
export const DEFAULT_OG_IMAGE = '/images/blog/moronel-usos-tradicionales.webp';

export function absoluteUrl(path = '/') {
  return new URL(path, SITE_URL).toString();
}

export function canonicalPath(path: string) {
  return path;
}

export function canonicalAlternates(path: string) {
  return { alternates: { canonical: canonicalPath(path) } };
}

export function socialMetadata(
  path: string,
  title: string,
  description: string,
  image = DEFAULT_OG_IMAGE,
) {
  return {
    openGraph: {
      type: 'website' as const,
      title,
      description,
      url: canonicalPath(path),
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [image],
    },
  };
}
