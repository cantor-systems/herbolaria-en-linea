import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Leaf, MessageCircle, PackageCheck, ShoppingBag, Sprout, Truck } from 'lucide-react';
import { BLOG_ARTICLES } from '@/content/blog';
import { PRODUCTS } from '@/data/products';
import { canonicalAlternates, socialMetadata } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Conocer Moronel',
  description: 'Conoce qué es Moronel, sus presentaciones en hierba, gotas y cápsulas, y encuentra información para elegir la opción que mejor se adapta a ti.',
  ...canonicalAlternates('/conocer-moronel'),
  ...socialMetadata('/conocer-moronel', 'Conocer Moronel', 'Conoce qué es Moronel, sus presentaciones en hierba, gotas y cápsulas, y encuentra información para elegir la opción que mejor se adapta a ti.'),
};

const presentationSlugs = ['moronel-hierba-240g', 'moronel-gotas-50ml', 'moronel-capsulas-60-capsulas'];
const articleSlugs = ['historia-usos-tradicionales-moronel-mexico', 'como-se-toma-el-moronel', 'propiedades-de-la-planta-moronel', 'contraindicaciones-del-moronel', 'moronel-planta-medicinal'];
const presentationDetails = {
  'moronel-hierba-240g': { amount: '240 g por bolsa', detail: 'Preparación tradicional en infusión.' },
  'moronel-gotas-50ml': { amount: '50 ml por frasco', detail: 'Formato compacto con gotero.' },
  'moronel-capsulas-60-capsulas': { amount: '60 cápsulas por frasco', detail: 'Formato práctico y portátil.' },
};
const trustPoints = [
  { icon: CheckCircle2, title: 'Información clara de cada presentación' },
  { icon: PackageCheck, title: 'Diferentes paquetes de compra' },
  { icon: Truck, title: 'Envíos a todo México' },
  { icon: MessageCircle, title: 'Atención por WhatsApp' },
];

export default function ConocerMoronelPage() {
  const presentations = presentationSlugs
    .map((slug) => PRODUCTS.find((product) => product.slug === slug))
    .filter((product): product is (typeof PRODUCTS)[number] => Boolean(product));
  const articles = articleSlugs
    .map((slug) => BLOG_ARTICLES.find((article) => article.slug === slug))
    .filter((article): article is (typeof BLOG_ARTICLES)[number] => Boolean(article));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-12 sm:space-y-16">
      <section className="bg-[#285F50] text-[#FAF7E8] p-7 sm:p-12 lg:p-16 rounded-3xl shadow-lg overflow-hidden relative">
        <div className="max-w-3xl space-y-5 relative z-10">
          <span className="text-xs font-black uppercase tracking-widest text-[#D17B24]">Conoce Moronel</span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">Moronel Planta de la Vida</h1>
          <p className="text-base sm:text-lg leading-relaxed text-[#FAF7E8]/90">Conoce la planta, sus presentaciones y la forma en que llevamos Moronel hasta tu hogar.</p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/tienda" className="inline-flex justify-center items-center gap-2 rounded-xl bg-[#D17B24] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#98552B] transition-colors">Ver productos <ShoppingBag className="w-4 h-4" /></Link>
            <a href="#presentaciones" className="inline-flex justify-center items-center gap-2 rounded-xl border border-[#FAF7E8]/60 px-5 py-3.5 text-sm font-bold text-[#FAF7E8] hover:bg-white/10 transition-colors">Conocer sus presentaciones <ArrowRight className="w-4 h-4" /></a>
          </div>
        </div>
        <Leaf className="absolute -right-8 -bottom-12 w-56 h-56 sm:w-72 sm:h-72 text-[#AFC28E]/15 rotate-[-18deg]" aria-hidden="true" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div className="space-y-4">
          <span className="text-xs font-black uppercase tracking-widest text-[#D17B24]">La planta y sus formatos</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#285F50]">¿Qué es Moronel?</h2>
          <div className="space-y-3 text-base sm:text-lg leading-8 text-[#23312C]/90">
            <p>Moronel, conocido también como Planta de la Vida, forma parte de la tradición herbolaria y actualmente se ofrece en distintas presentaciones pensadas para diferentes formas de consumo.</p>
            <p>En Moronel Planta de la Vida encontrarás productos en hierba deshidratada, extracto en gotas y cápsulas, comercializados bajo la línea Herbazen.</p>
          </div>
        </div>
        <div className="aspect-4/3 rounded-3xl overflow-hidden border border-[#D9D1B9] bg-[#F4EFD6] shadow-sm"><img src="/images/blog/moronel-usos-tradicionales.webp" alt="Moronel en un contexto de herbolaria tradicional" className="w-full h-full object-cover" /></div>
      </section>

      <section id="presentaciones" className="scroll-mt-28 space-y-6">
        <div className="space-y-2 max-w-2xl"><span className="text-xs font-black uppercase tracking-widest text-[#D17B24]">Elige tu formato</span><h2 className="text-2xl sm:text-3xl font-extrabold text-[#285F50]">Presentaciones de Moronel</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {presentations.map((product) => {
            const detail = presentationDetails[product.slug as keyof typeof presentationDetails];
            return <article key={product.id} className="rounded-3xl overflow-hidden border border-[#D9D1B9] bg-[#FAF7E8] shadow-sm flex flex-col">
              <div className="aspect-4/3 bg-[#F4EFD6] overflow-hidden"><img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" /></div>
              <div className="p-5 space-y-3 flex flex-col flex-1"><h3 className="text-xl font-extrabold text-[#23312C]">{product.categoryName}</h3><p className="text-sm font-bold text-[#D17B24]">{detail.amount}</p><p className="text-sm leading-6 text-[#23312C]/80 flex-1">{detail.detail}</p><Link href={`/producto/${product.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#285F50] hover:underline pt-1">Ver producto <ArrowRight className="w-4 h-4" /></Link></div>
            </article>;
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-[#D9D1B9] bg-[#F4EFD6] p-6 sm:p-8 space-y-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#285F50]">Una experiencia de compra clara y directa</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{trustPoints.map(({ icon: Icon, title }, index) => <div key={`trust-${index}`} className="rounded-2xl bg-[#FAF7E8] border border-[#D9D1B9] p-4 flex gap-3 items-start"><Icon className="w-5 h-5 text-[#D17B24] shrink-0 mt-0.5" /><p className="text-sm font-bold leading-5 text-[#23312C]">{title}</p></div>)}</div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
        <div className="lg:col-span-2 rounded-3xl bg-[#285F50] text-[#FAF7E8] p-8 flex justify-center"><Sprout className="w-20 h-20 text-[#D17B24]" /></div>
        <div className="lg:col-span-3 space-y-4"><span className="text-xs font-black uppercase tracking-widest text-[#D17B24]">La línea de productos</span><h2 className="text-2xl sm:text-3xl font-extrabold text-[#285F50]">Productos Herbazen</h2><p className="text-base sm:text-lg leading-8 text-[#23312C]/90">Herbazen es la línea bajo la cual se presentan los productos de Moronel disponibles en esta tienda.</p><p className="text-base sm:text-lg leading-8 text-[#23312C]/90">Moronel Planta de la Vida es la identidad principal del sitio y el punto de referencia para conocer las presentaciones, comprar y recibir atención.</p></div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2 max-w-2xl"><span className="text-xs font-black uppercase tracking-widest text-[#D17B24]">Información para elegir</span><h2 className="text-2xl sm:text-3xl font-extrabold text-[#285F50]">Conoce más sobre Moronel</h2></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">{articles.map((article, articleIndex) => <Link key={`article-${articleIndex}`} href={`/blog/${article.slug}`} className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-4 hover:border-[#285F50] hover:shadow-sm transition-all group"><BookOpen className="w-5 h-5 text-[#D17B24] mb-3" /><h3 className="font-extrabold text-sm leading-5 text-[#23312C] group-hover:text-[#285F50]">{article.title}</h3><span className="mt-3 inline-flex text-xs font-bold text-[#285F50]">Leer artículo <ArrowRight className="w-3.5 h-3.5 ml-1" /></span></Link>)}</div>
      </section>

      <section className="rounded-3xl bg-[#285F50] text-[#FAF7E8] p-7 sm:p-10 text-center space-y-5"><h2 className="text-2xl sm:text-3xl font-extrabold">Encuentra la presentación de Moronel que mejor se adapta a ti</h2><Link href="/tienda" className="inline-flex items-center gap-2 rounded-xl bg-[#D17B24] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#98552B] transition-colors">Explorar productos <ArrowRight className="w-4 h-4" /></Link></section>
    </div>
  );
}
