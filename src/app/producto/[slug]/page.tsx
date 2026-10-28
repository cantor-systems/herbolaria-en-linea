'use client';

import React, { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PRODUCTS } from '@/data/products';
import { getBrandBySlug } from '@/data/brands';
import { getCategoryBySlug } from '@/data/categories';
import { ProductVariant } from '@/types';
import { ProductGallery } from '@/components/product/ProductGallery';
import { VariantSelector } from '@/components/product/VariantSelector';
import { ProductCard } from '@/components/product/ProductCard';
import { formatCurrency, calculateSavingsPercentage } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { STORE_CONFIG, getWhatsAppHref } from '@/config/store';
import { SHOW_MOCK_RATINGS } from '@/data/ratings';
import { trackViewItem, trackWhatsAppClick } from '@/lib/analytics';
import { absoluteUrl } from '@/lib/site';
import {
  Star,
  ShoppingBag,
  MessageCircle,
  Truck,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Info,
  Clock,
  HelpCircle,
} from 'lucide-react';

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = use(params);
  const product = PRODUCTS.find((p) => p.slug === slug);

  if (!product) {
    notFound();
  }

  const { addToCart } = useCart();
  const trackedProductSlug = useRef<string | null>(null);
  const brandName = getBrandBySlug(product.brandSlug)?.name ?? product.brandSlug;
  const categoryName = getCategoryBySlug(product.categorySlug)?.name ?? product.categorySlug;
  const isSingleVariantHerbazen = product.brandSlug === 'herbazen' && product.variants.length === 1;
  const defaultVariant = product.variants.find((v) => v.isPopular) || product.variants[0];
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(defaultVariant);
  const [selectedImage, setSelectedImage] = useState(defaultVariant.image || product.images[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'usage' | 'shipping' | 'claims' | 'faq'>('desc');

  useEffect(() => {
    setSelectedVariant(defaultVariant);
    setSelectedImage(defaultVariant.image || product.images[0] || '');
    setQuantity(1);
  }, [product]);

  useEffect(() => {
    if (trackedProductSlug.current === product.slug) return;
    trackedProductSlug.current = product.slug;
    trackViewItem({ item_id: product.slug, item_name: product.name, item_variant: defaultVariant.name, price: defaultVariant.priceCents / 100, quantity: 1 });
  }, [defaultVariant, product]);

  const handleVariantChange = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    if (variant.image) {
      setSelectedImage(variant.image);
    }
  };

  const savings = calculateSavingsPercentage(
    selectedVariant.compareAtPriceCents || 0,
    selectedVariant.priceCents
  );

  const whatsappMessage = encodeURIComponent(
    `Hola, me interesa comprar el producto "${product.name}" en la presentación "${selectedVariant.name}" (${quantity} unidad/es, ${formatCurrency(
      selectedVariant.priceCents * quantity
    )}). ¿Me ayudan a levantar el pedido?`
  );

  const relatedProducts = PRODUCTS.filter((p) => p.id !== product.id).slice(0, 3);
  const productUrl = absoluteUrl(`/producto/${product.slug}`);
  const productAvailability =
    product.stockStatus === 'in_stock' || product.stockStatus === 'low_stock'
      ? 'https://schema.org/InStock'
      : product.stockStatus === 'out_of_stock'
        ? 'https://schema.org/OutOfStock'
        : undefined;
  const productStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription,
    image: absoluteUrl(product.images[0]),
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: brandName,
    },
    ...(product.status === 'active'
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: product.currency,
            price: (defaultVariant.priceCents / 100).toFixed(2),
            ...(productAvailability ? { availability: productAvailability } : {}),
            url: productUrl,
          },
        }
      : {}),
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
        name: categoryName,
        item: absoluteUrl(`/categoria/${product.categorySlug}`),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />

      {/* Breadcrumb Back */}
      <div className="flex items-center gap-2 text-xs font-bold text-[#6F8F69]">
        <Link href="/tienda" className="hover:text-[#285F50] flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Catálogo</span>
        </Link>
        <span>/</span>
        <Link href={`/categoria/${product.categorySlug}`} className="hover:text-[#285F50]">
          {categoryName}
        </Link>
        <span>/</span>
        <span className="text-[#23312C] truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

        {/* Left Column: Gallery (5 cols) */}
        <div className="lg:col-span-5">
          <ProductGallery
            images={product.images}
            productName={product.name}
            selectedImage={selectedImage}
            onSelectImage={setSelectedImage}
          />
        </div>

        {/* Right Column: Details & Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#285F50] text-[#FAF7E8]">
                {isSingleVariantHerbazen ? brandName : `Marca ${brandName}`}
              </span>
              {!isSingleVariantHerbazen && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#D17B24] text-white">
                  {categoryName}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#23312C] leading-tight">
              {product.name}
            </h1>

            {/* Rating */}
            {SHOW_MOCK_RATINGS && <div className="flex items-center gap-2 mt-2 text-amber-600">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current text-amber-500" />
                ))}
              </div>
              <span className="text-xs font-bold text-[#23312C]">{product.rating}</span>
              <span className="text-xs text-[#6F8F69]">({product.reviewCount} opiniones verificadas)</span>
            </div>}
          </div>

          <p className="text-xs sm:text-sm text-[#23312C]/80 leading-relaxed bg-[#F4EFD6] p-3.5 rounded-2xl border border-[#D9D1B9]">
            {isSingleVariantHerbazen
              ? product.shortDescription
              : `Información de la presentación: ${categoryName}.`}
          </p>

          {/* Variant Selector Component */}
          <VariantSelector
            variants={product.variants}
            selectedVariant={selectedVariant}
            onSelectVariant={handleVariantChange}
            label={isSingleVariantHerbazen ? 'Presentación:' : undefined}
          />

          {/* Price & Quantity Controls Box */}
          <div className="bg-[#FAF7E8] p-4 sm:p-5 rounded-2xl border-2 border-[#285F50] space-y-4 shadow-sm">

            <div className="flex items-baseline justify-between border-b border-[#D9D1B9] pb-3">
              <div>
                <span className="text-[11px] text-[#6F8F69] font-bold uppercase block">
                  Precio Total Selección ({quantity} paquete/s):
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#285F50]">
                    {formatCurrency(selectedVariant.priceCents * quantity)}
                  </span>
                  {selectedVariant.compareAtPriceCents &&
                    selectedVariant.compareAtPriceCents > selectedVariant.priceCents && (
                    <span className="text-sm text-[#23312C]/60 line-through">
                      {formatCurrency(selectedVariant.compareAtPriceCents * quantity)}
                    </span>
                  )}
                </div>
              </div>

              {savings > 0 && (
                <span className="px-3 py-1 bg-[#D17B24] text-white text-xs font-black rounded-lg">
                  {savings}% Ahorro Incluido
                </span>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-[#23312C] uppercase">
                {isSingleVariantHerbazen ? 'Cantidad:' : 'Cantidad de Paquetes:'}
              </span>

              <div className="flex items-center border border-[#D9D1B9] rounded-xl bg-[#F4EFD6]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 text-base font-bold text-[#23312C] hover:bg-[#D9D1B9]/50 rounded-l-xl"
                >
                  -
                </button>
                <span className="px-4 text-sm font-black text-[#23312C]">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-1.5 text-base font-bold text-[#23312C] hover:bg-[#D9D1B9]/50 rounded-r-xl"
                >
                  +
                </button>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => addToCart(product, selectedVariant, quantity)}
                className="w-full py-3.5 px-6 bg-[#285F50] hover:bg-[#23312C] text-[#FAF7E8] font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 min-h-[48px]"
              >
                <ShoppingBag className="w-5 h-5 text-[#D17B24]" />
                <span>Agregar al Carrito de Compras</span>
              </button>

              <a
                href={getWhatsAppHref() || undefined}
                aria-disabled={!getWhatsAppHref()}
                onClick={() => trackWhatsAppClick('product', { productSlug: product.slug, placement: 'product_detail' })}
                className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Pedir y Comprar por WhatsApp</span>
              </a>
            </div>

            <div className="flex items-center justify-around text-[11px] text-[#6F8F69] font-medium pt-2 border-t border-[#D9D1B9]/60">
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#D17B24]" /> Envíos a todo México
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#285F50]" /> Pago seguro con Mercado Pago
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* Tabs Section */}
      <div className="bg-[#FAF7E8] border border-[#D9D1B9] rounded-3xl p-6 space-y-6 shadow-xs">
        <div className="flex items-center gap-2 border-b border-[#D9D1B9] pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('desc')}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              activeTab === 'desc'
                ? 'bg-[#285F50] text-[#FAF7E8]'
                : 'bg-[#F4EFD6] text-[#23312C] hover:bg-[#D9D1B9]/50'
            }`}
          >
            Descripción y Detalles
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              activeTab === 'usage'
                ? 'bg-[#285F50] text-[#FAF7E8]'
                : 'bg-[#F4EFD6] text-[#23312C] hover:bg-[#D9D1B9]/50'
            }`}
          >
            Ingredientes y Modo de Uso
          </button>
          <button
            onClick={() => setActiveTab('shipping')}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              activeTab === 'shipping'
                ? 'bg-[#285F50] text-[#FAF7E8]'
                : 'bg-[#F4EFD6] text-[#23312C] hover:bg-[#D9D1B9]/50'
            }`}
          >
            Información de Envío
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              activeTab === 'claims'
                ? 'bg-[#285F50] text-[#FAF7E8]'
                : 'bg-[#F4EFD6] text-[#23312C] hover:bg-[#D9D1B9]/50'
            }`}
          >
            Avisos Sanitarios
          </button>
        </div>

        <div className="text-xs sm:text-sm text-[#23312C]/90 leading-relaxed">
          {activeTab === 'desc' && (
            <div className="space-y-3">
              <p>Información de la presentación y contenido del envase.</p>
              {product.benefits && (
                <div className="space-y-1.5 pt-2">
                  <h4 className="font-bold text-[#285F50]">Cualidades Principales:</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {product.benefits.map((b, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-[#285F50] mb-1">Ingredientes:</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  {product.ingredients?.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-[#285F50] mb-1">Modo de Uso Recomendado:</h4>
                <p className="text-xs">{product.usageInstructions}</p>
              </div>
              <div>
                <h4 className="font-bold text-[#285F50] mb-1">Presentación Físico-química:</h4>
                <p className="text-xs">{product.contentVolume}</p>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-3 text-xs">
              <p>
                <strong>Envíos Nacionales:</strong> Realizamos despachos diarios a través de paqueterías líderes en México (FedEx, DHL, Estafeta).
              </p>
              <p>
                <strong>Tiempo estimado de entrega:</strong> Estándar 4–5 días hábiles; exprés 1–2 días hábiles. Te enviaremos tu código de rastreo por WhatsApp y correo electrónico.
              </p>
              <p>
                <strong>Envío Gratis:</strong> Estándar sin costo desde $799 MXN o cuando el carrito incluye una presentación participante.
              </p>
            </div>
          )}

          {activeTab === 'claims' && (
            <div className="space-y-3 text-xs bg-[#F4EFD6] p-4 rounded-xl border border-[#D9D1B9]">
              <p className="font-bold text-[#98552B]">Aviso de Consumo Herbolario Tradicional:</p>
              <p>
                Los productos Herbazen a base de Moronel se venden como tradición herbolaria en México. No constituyen un diagnóstico ni tratamiento médico prescrito. Si estás bajo supervisión clínica o gestación, consulta a tu profesional de salud.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      <div className="space-y-4 pt-6 border-t border-[#D9D1B9]">
        <h2 className="text-xl font-bold text-[#23312C]">
          Otras Presentaciones de Moronel Planta de la Vida:
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {relatedProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>

    </div>
  );
}
