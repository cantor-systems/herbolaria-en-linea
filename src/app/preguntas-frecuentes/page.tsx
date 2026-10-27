import { FAQSection } from '@/components/marketing/FAQSection';
import { HOMEPAGE_CONTENT } from '@/content/homepage';
import type { Metadata } from 'next';
import { canonicalAlternates, socialMetadata } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Preguntas frecuentes',
  description: 'Encuentra respuestas a preguntas frecuentes sobre las presentaciones, compra y envío de Moronel.',
  ...canonicalAlternates('/preguntas-frecuentes'),
  ...socialMetadata('/preguntas-frecuentes', 'Preguntas frecuentes', 'Encuentra respuestas a preguntas frecuentes sobre las presentaciones, compra y envío de Moronel.'),
};

const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HOMEPAGE_CONTENT.faq.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default function FAQPage() {
  return (
    <div className="py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <FAQSection />
    </div>
  );
}
