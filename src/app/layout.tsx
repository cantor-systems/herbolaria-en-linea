import type { Metadata } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { TopAnnouncementBar } from '@/components/store/TopAnnouncementBar';
import { Header } from '@/components/store/Header';
import { Footer } from '@/components/store/Footer';
import { DrawerCart } from '@/components/store/DrawerCart';
import { STORE_CONFIG } from '@/config/store';
import { DEFAULT_OG_IMAGE, metadataBase, SITE_NAME, SITE_URL } from '@/lib/site';
import { Clarity } from '@/components/analytics/Clarity';

const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
};
const organizationStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: STORE_CONFIG.storeName,
  url: SITE_URL,
};

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  title: {
    default: 'Moronel Planta de la Vida | Productos Moronel en México',
    template: `%s | ${SITE_NAME}`,
  },
  description: 'Conoce Moronel Planta de la Vida y sus presentaciones en hierba, gotas y cápsulas. Compra en línea y consulta información sobre productos, uso tradicional y presentaciones disponibles.',
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: SITE_NAME,
    title: 'Moronel Planta de la Vida | Productos Moronel en México',
    description: 'Conoce Moronel Planta de la Vida y sus presentaciones en hierba, gotas y cápsulas.',
    images: [{ url: DEFAULT_OG_IMAGE, alt: 'Moronel Planta de la Vida en un contexto de herbolaria tradicional' }],
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
        />
      </head>
      <body className="bg-[#FAF7E8] text-[#23312C] antialiased min-h-screen flex flex-col justify-between selection:bg-[#285F50] selection:text-[#FAF7E8]">
        <CartProvider>
          <div>
            <TopAnnouncementBar />
            <Header />
            <main className="w-full max-w-full overflow-hidden">{children}</main>
          </div>
          <DrawerCart />
          <Footer />
        </CartProvider>
        {googleAnalyticsId && <GoogleAnalytics gaId={googleAnalyticsId} />}
        <Clarity projectId={clarityProjectId} />
      </body>
    </html>
  );
}
