import type { Metadata } from 'next';
import { Fragment } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Calendar, ChevronRight, Info } from 'lucide-react';
import { BLOG_ARTICLES, getBlogArticle } from '@/content/blog';
import { absoluteUrl, canonicalAlternates, DEFAULT_OG_IMAGE } from '@/lib/site';

type BlogArticlePageProps = {
  params: Promise<{ slug: string }>;
};

const spanishMonthNumbers: Record<string, string> = {
  Enero: '01',
  Febrero: '02',
  Marzo: '03',
  Abril: '04',
  Mayo: '05',
  Junio: '06',
  Julio: '07',
  Agosto: '08',
  Septiembre: '09',
  Octubre: '10',
  Noviembre: '11',
  Diciembre: '12',
};

function toIsoDate(date: string) {
  const match = /^(\d{1,2}) de ([A-Za-zÁÉÍÓÚáéíóúÑñ]+), (\d{4})$/.exec(date.trim());
  if (!match) return undefined;

  const [, day, monthName, year] = match;
  const month = spanishMonthNumbers[monthName];
  if (!month) return undefined;

  return `${year}-${month}-${day.padStart(2, '0')}`;
}

export function generateStaticParams() {
  return BLOG_ARTICLES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getBlogArticle(slug);

  if (!article) {
    return { title: 'Artículo no encontrado | Moronel Planta de la Vida' };
  }

  return {
    title: article.title,
    description: article.description,
    ...canonicalAlternates(`/blog/${article.slug}`),
    openGraph: { type: 'article', title: article.title, description: article.description, url: `/blog/${article.slug}`, images: [{ url: article.image || DEFAULT_OG_IMAGE, alt: article.imageAlt }] },
    twitter: { card: 'summary_large_image', title: article.title, description: article.description, images: [article.image || DEFAULT_OG_IMAGE] },
  };
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const article = getBlogArticle(slug);

  if (!article) {
    notFound();
  }

  const articleUrl = absoluteUrl(`/blog/${article.slug}`);
  const datePublished = toIsoDate(article.date);
  const articleStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: absoluteUrl(article.image || DEFAULT_OG_IMAGE),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    ...(datePublished ? { datePublished } : {}),
  };
  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: absoluteUrl('/blog'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: articleUrl,
      },
    ],
  };

  const comparisonTable = article.comparison && (
    <section className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight text-[#285F50]">{article.comparison.heading}</h2>
      <div className="overflow-x-auto rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8]">
        <table className="w-full min-w-175 text-left text-sm sm:text-base leading-6">
          <thead className="bg-[#285F50] text-[#FAF7E8]">
            <tr>{article.comparison.columns.map((column, columnIndex) => <th key={`column-${columnIndex}`} scope="col" className="p-3 sm:p-4 font-bold">{column}</th>)}</tr>
          </thead>
          <tbody>{article.comparison.rows.map((row, rowIndex) => <tr key={`row-${rowIndex}`} className="border-t border-[#D9D1B9] align-top">{row.map((cell, cellIndex) => <td key={`cell-${rowIndex}-${cellIndex}`} className={`p-3 sm:p-4 ${cellIndex === 0 ? 'font-bold text-[#285F50]' : ''}`}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  );

  const educationalBlock = article.educationalBlock && (
    <section className="rounded-3xl border border-[#D9D1B9] bg-[#F4EFD6] p-5 sm:p-7 space-y-5">
      <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight text-[#285F50]">{article.educationalBlock.heading}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {article.educationalBlock.concepts.map((concept, conceptIndex) => (
          <div key={`concept-${conceptIndex}`} className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-4 space-y-1">
            <h3 className="font-extrabold text-[#23312C]">{concept.title}</h3>
            <p className="text-sm sm:text-base leading-6 text-[#23312C]/80">{concept.description}</p>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-bold text-[#6F8F69] mb-7 overflow-x-auto whitespace-nowrap">
        <Link href="/" className="hover:text-[#285F50]">Inicio</Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <Link href="/blog" className="hover:text-[#285F50]">Blog</Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[#23312C] truncate">{article.title}</span>
      </nav>

      <header className="space-y-5 mb-8 sm:mb-10">
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          <span className="rounded-full bg-[#285F50] px-3 py-1.5 uppercase tracking-wide text-[#FAF7E8]">{article.category}</span>
          <span className="flex items-center gap-1.5 text-[#6F8F69]"><Calendar className="w-4 h-4" />{article.date}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-[#23312C]">{article.title}</h1>
        <p className="text-base sm:text-lg leading-relaxed text-[#285F50] font-medium border-l-4 border-[#D17B24] pl-4">{article.summary}</p>
      </header>

      <div className="aspect-16/9 rounded-3xl overflow-hidden border border-[#D9D1B9] bg-[#F4EFD6] shadow-sm mb-9 sm:mb-12">
        <img src={article.image} alt={article.imageAlt} className="w-full h-full object-cover" />
      </div>

      <div className="space-y-9 text-base sm:text-lg leading-8 text-[#23312C]/90">
        {article.sections.map((section, sectionIndex) => (
          <Fragment key={`section-${sectionIndex}`}>
          <section className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight text-[#285F50]">{section.heading}</h2>
            {section.paragraphs.map((paragraph, paragraphIndex) => <p key={`paragraph-${sectionIndex}-${paragraphIndex}`}>{paragraph}</p>)}
            {section.list && (
              <ul className="space-y-2 list-disc pl-5 marker:text-[#D17B24]">
                {section.list.map((item, itemIndex) => <li key={`list-item-${sectionIndex}-${itemIndex}`}>{item}</li>)}
              </ul>
            )}
            {section.links && (
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-sm sm:text-base font-bold">
                {section.links.map((link, linkIndex) => <Link key={`link-${sectionIndex}-${linkIndex}`} href={link.href} className="text-[#285F50] hover:underline">{link.label} <ArrowRight className="inline w-4 h-4" /></Link>)}
              </div>
            )}
          </section>
          {article.comparisonAfterSection === section.heading && comparisonTable}
          {article.educationalBlockAfterSection === section.heading && educationalBlock}
          </Fragment>
        ))}

        {!article.comparisonAfterSection && comparisonTable}
        {!article.educationalBlockAfterSection && educationalBlock}

        {article.notice && (
          <aside className="rounded-2xl border border-[#D9D1B9] bg-[#F4EFD6] p-5 sm:p-6 flex gap-3 text-sm sm:text-base leading-7">
            <Info className="w-5 h-5 text-[#D17B24] shrink-0 mt-1" />
            <p><strong className="text-[#98552B]">Aviso informativo. </strong>{article.notice.replace('Aviso informativo: ', '')}</p>
          </aside>
        )}
      </div>

      <section className="mt-10 sm:mt-12 rounded-3xl bg-[#285F50] text-[#FAF7E8] p-6 sm:p-8 text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold">{article.cta.title}</h2>
        <p className="text-sm sm:text-base leading-relaxed text-[#FAF7E8]/90 max-w-2xl mx-auto">{article.cta.description}</p>
        <Link href={article.cta.href} className="inline-flex items-center gap-2 rounded-xl bg-[#D17B24] px-5 py-3 text-sm font-bold text-white hover:bg-[#98552B] transition-colors">
          {article.cta.label}<ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <div className="mt-8">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-[#285F50] hover:underline"><ArrowLeft className="w-4 h-4" />Volver al Blog</Link>
      </div>
    </article>
  );
}
