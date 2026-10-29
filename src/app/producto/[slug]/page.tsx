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
import { StockStatusBadge } from '@/components/product/StockStatusBadge';
import { formatCurrency, calculateSavingsPercentage } from '@/lib/utils';
import { getRelatedProducts } from '@/lib/catalog';
import { useCart } from '@/context/CartContext';
import { getWhatsAppHref } from '@/config/store';
import { SHIPPING_CONFIG } from '@/config/shipping';
import { trackViewItem, trackWhatsAppClick } from '@/lib/analytics';
import { absoluteUrl } from '@/lib/site';
import {
  ShoppingBag,
  MessageCircle,
  Truck,
  ShieldCheck,
  PackageSearch,
  CheckCircle2,
  ArrowLeft,
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
  const isSingleVariant = product.variants.length === 1;
  const defaultVariant = product.variants.find((v) => v.isPopular) || product.variants[0];
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(defaultVariant);
  const [selectedImage, setSelectedImage] = useState(defaultVariant.image || product.images[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'usage' | 'shipping' | 'claims'>('desc');

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

  const whatsappHref = getWhatsAppHref();

  const relatedProducts = getRelatedProducts(product);
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-x-12 lg:gap-y-6 items-start">
        {/* Product identity appears first on mobile and beside the gallery on desktop. */}
        <div className="order-1 lg:order-2 lg:col-span-7 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#285F50]">
              {brandName}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4EFD6] text-[#6F8F69] border border-[#D9D1B9]">
              {categoryName}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#23312C] leading-tight">
            {product.name}
          </h1>

          {product.shortDescription && (
            <p className="text-sm text-[#23312C]/80 leading-relaxed">
              {product.shortDescription}
            </p>
          )}
        </div>

        {/* Gallery remains unchanged and follows the product identity on mobile. */}
        <div className="order-2 lg:order-1 lg:col-span-5 lg:row-span-2">
          <ProductGallery
            images={product.images}
            productName={product.name}
            selectedImage={selectedImage}
            onSelectImage={setSelectedImage}
          />
        </div>

        {/* Purchase controls */}
        <div className="order-3 lg:col-span-7 bg-[#FAF7E8] p-4 sm:p-5 rounded-2xl border-2 border-[#285F50] space-y-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-[#D9D1B9] pb-3">
            <div>
              <span className="text-[11px] text-[#6F8F69] font-bold uppercase block">
                Precio
              </span>
              <div className="flex flex-wrap items-baseline gap-2">
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
              {selectedVariant.unitsCount > 1 && (
                <span className="text-[11px] text-[#6F8F69] font-medium block mt-1">
                  {formatCurrency(selectedVariant.unitPriceCents)} por unidad
                </span>
              )}
              {selectedVariant.freeShippingEligible && (
                <span className="text-[11px] font-bold text-emerald-700 block mt-1">
                  Incluye envío estándar gratis
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              <StockStatusBadge stockStatus={product.stockStatus} />
              {savings > 0 && (
                <span className="px-3 py-1 bg-[#D17B24] text-white text-xs font-black rounded-lg">
                  {savings}% de ahorro
                </span>
              )}
            </div>
          </div>

          {isSingleVariant ? (
            <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F4EFD6] border border-[#D9D1B9] px-3 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F8F69]">
                Presentación
              </span>
              <span className="text-xs font-bold text-[#23312C] text-right">
                {selectedVariant.name}
              </span>
            </div>
          ) : (
            <VariantSelector
              variants={product.variants}
              selectedVariant={selectedVariant}
              onSelectVariant={handleVariantChange}
            />
          )}

          {selectedVariant.wholesaleEligible && (
            <p className="text-xs font-semibold text-[#98552B] bg-[#D17B24]/10 border border-[#D17B24]/20 rounded-xl px-3 py-2.5">
              Disponible para compra por volumen
            </p>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-[#23312C] uppercase">
              Cantidad
            </span>

            <div className="flex items-center border border-[#D9D1B9] rounded-xl bg-[#F4EFD6]">
              <button
                type="button"
                aria-label="Disminuir cantidad"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="min-w-[44px] min-h-[44px] px-3 text-base font-bold text-[#23312C] hover:bg-[#D9D1B9]/50 rounded-l-xl"
              >
                -
              </button>
              <span className="min-w-12 px-2 text-center text-sm font-black text-[#23312C]">{quantity}</span>
              <button
                type="button"
                aria-label="Aumentar cantidad"
                onClick={() => setQuantity((q) => q + 1)}
                className="min-w-[44px] min-h-[44px] px-3 text-base font-bold text-[#23312C] hover:bg-[#D9D1B9]/50 rounded-r-xl"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={product.stockStatus === 'out_of_stock'}
            onClick={() => {
              if (product.stockStatus !== 'out_of_stock') {
                addToCart(product, selectedVariant, quantity);
              }
            }}
            className="w-full py-3.5 px-6 bg-[#285F50] hover:bg-[#23312C] text-[#FAF7E8] font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 min-h-[48px] disabled:cursor-not-allowed disabled:bg-[#23312C]/45 disabled:shadow-none"
          >
            <ShoppingBag className="w-5 h-5 text-[#D17B24]" />
            <span>
              {product.stockStatus === 'out_of_stock'
                ? 'Producto agotado'
                : 'Agregar al carrito'}
            </span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#6F8F69] font-medium">
            <span className="min-h-[44px] flex items-center gap-2 rounded-xl bg-[#F4EFD6] px-3 py-2">
              <ShieldCheck className="w-4 h-4 text-[#285F50] shrink-0" /> Pago mediante Mercado Pago
            </span>
            {SHIPPING_CONFIG.enabled && (
              <span className="min-h-[44px] flex items-center gap-2 rounded-xl bg-[#F4EFD6] px-3 py-2">
                <Truck className="w-4 h-4 text-[#D17B24] shrink-0" /> Envío disponible en México
              </span>
            )}
            {SHIPPING_CONFIG.trackingAvailable && (
              <span className="min-h-[44px] flex items-center gap-2 rounded-xl bg-[#F4EFD6] px-3 py-2">
                <PackageSearch className="w-4 h-4 text-[#285F50] shrink-0" /> Rastreo de pedido
              </span>
            )}
          </div>

          {whatsappHref && (
            <a
              href={whatsappHref}
              onClick={() => trackWhatsAppClick('product', { productSlug: product.slug, placement: 'product_detail' })}
              className="w-full py-3 px-6 border border-emerald-600 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Consultar por WhatsApp</span>
            </a>
          )}
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-[#FAF7E8] border border-[#D9D1B9] rounded-3xl p-6 space-y-6 shadow-xs">
        <div className="flex items-center gap-2 border-b border-[#D9D1B9] pb-3 overflow-x-auto overscroll-x-contain">
          <button
            onClick={() => setActiveTab('desc')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              activeTab === 'desc'
                ? 'bg-[#285F50] text-[#FAF7E8]'
                : 'bg-[#F4EFD6] text-[#23312C] hover:bg-[#D9D1B9]/50'
            }`}
          >
            Descripción y Detalles
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              activeTab === 'usage'
                ? 'bg-[#285F50] text-[#FAF7E8]'
                : 'bg-[#F4EFD6] text-[#23312C] hover:bg-[#D9D1B9]/50'
            }`}
          >
            Ingredientes y Modo de Uso
          </button>
          <button
            onClick={() => setActiveTab('shipping')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              activeTab === 'shipping'
                ? 'bg-[#285F50] text-[#FAF7E8]'
                : 'bg-[#F4EFD6] text-[#23312C] hover:bg-[#D9D1B9]/50'
            }`}
          >
            Información de Envío
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
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
              <p>{product.description}</p>
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
                <strong>Envíos nacionales:</strong> {SHIPPING_CONFIG.coverage}. Paqueterías disponibles: {SHIPPING_CONFIG.couriers.join(', ')}.
              </p>
              <p>
                <strong>Tiempo estimado de entrega:</strong> Estándar {SHIPPING_CONFIG.standardEstimatedDays}; exprés {SHIPPING_CONFIG.expressEstimatedDays}. {SHIPPING_CONFIG.disclaimer}
              </p>
              <p>
                <strong>Envío gratis:</strong> Estándar sin costo desde {formatCurrency(SHIPPING_CONFIG.freeShippingThresholdCents)} o cuando el carrito incluye una presentación participante.
              </p>
              {SHIPPING_CONFIG.trackingAvailable && (
                <p><strong>Rastreo:</strong> Consulta el estado del pedido y la guía cuando el envío sea despachado.</p>
              )}
            </div>
          )}

          {activeTab === 'claims' && (
            <div className="space-y-3 text-xs bg-[#F4EFD6] p-4 rounded-xl border border-[#D9D1B9]">
              <p className="font-bold text-[#98552B]">Aviso de Consumo Herbolario Tradicional:</p>
              <p>
                Este producto se ofrece dentro del contexto de la herbolaria tradicional. No constituye un diagnóstico ni tratamiento médico prescrito. Si estás bajo supervisión clínica o gestación, consulta a tu profesional de salud.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      <div className="space-y-4 pt-6 border-t border-[#D9D1B9]">
        <h2 className="text-xl font-bold text-[#23312C]">
          Productos relacionados
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
