import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';
import { BLOG_ARTICLES } from '@/content/blog';
import type { Metadata } from 'next';
import { canonicalAlternates, socialMetadata } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Consulta artículos informativos sobre Moronel, su contexto herbolario tradicional y sus presentaciones disponibles.',
  ...canonicalAlternates('/blog'),
  ...socialMetadata('/blog', 'Blog', 'Consulta artículos informativos sobre Moronel, su contexto herbolario tradicional y sus presentaciones disponibles.'),
};

export default function BlogPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-[#285F50] text-[#FAF7E8] p-8 sm:p-12 rounded-3xl shadow-lg space-y-3">
        <span className="text-xs font-black uppercase text-[#D17B24]">
          Divulgación Herbolaria Tradicional
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
          Blog Oficial Moronel Planta de la Vida
        </h1>
        <p className="text-xs sm:text-sm text-[#FAF7E8]/90 max-w-2xl leading-relaxed">
          Artículos informativos sobre la conservación de la planta, cosechas sostenibles e información de productos Herbazen.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {BLOG_ARTICLES.map((art) => (
          <div key={art.slug} className="bg-[#FAF7E8] rounded-3xl border border-[#D9D1B9] overflow-hidden shadow-xs hover:shadow-md transition-shadow">
            <div className="aspect-16/9 bg-[#F4EFD6] overflow-hidden">
              <img src={art.image} alt={art.imageAlt || art.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-6 space-y-3">
              <span className="text-[11px] font-bold text-[#6F8F69] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{art.date}</span>
              </span>
              <h3 className="font-extrabold text-[#23312C] text-lg leading-snug">{art.title}</h3>
              <p className="text-xs text-[#6F8F69] leading-relaxed">{art.summary}</p>
              <Link href={`/blog/${art.slug}`} className="inline-flex items-center gap-1 text-xs font-bold text-[#285F50] hover:underline pt-2">
                <span>Leer artículo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
