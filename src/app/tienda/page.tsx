'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PRODUCTS } from '@/data/products';
import { CATEGORIES } from '@/data/categories';
import { getBrandBySlug } from '@/data/brands';
import { ProductCard } from '@/components/product/ProductCard';
import { Search, Filter, SlidersHorizontal, Leaf } from 'lucide-react';

function StoreCatalogContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get('q') || '';
  const categoryParam = searchParams?.get('categoria') || 'todas';

  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      const brandName = getBrandBySlug(product.brandSlug)?.name ?? product.brandSlug;
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brandName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'todas' || product.categorySlug === selectedCategory;

      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.priceCents - b.priceCents;
      if (sortBy === 'price-desc') return b.priceCents - a.priceCents;
      if (sortBy === 'rating') return b.rating - a.rating;
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [searchTerm, selectedCategory, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title Header */}
      <div className="bg-[#285F50] text-[#FAF7E8] p-6 sm:p-10 rounded-3xl shadow-lg space-y-3">
        <span className="text-xs font-black uppercase tracking-widest text-[#D17B24]">
          Catálogo Oficial Moronel Planta de la Vida
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight">
          Tienda de Productos Herbolarios Herbazen
        </h1>
        <p className="text-xs sm:text-sm text-[#FAF7E8]/90 max-w-2xl leading-relaxed">
          Explora todas las presentaciones de Moronel en gotas concentradas, cápsulas vegetales y hoja seca deshidratada con envío seguro a todo México.
        </p>
      </div>

      {/* Filter & Controls Bar */}
      <div className="bg-[#FAF7E8] p-4 rounded-2xl border border-[#D9D1B9] shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar por nombre, presentación o ingrediente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F4EFD6] text-[#23312C] text-xs sm:text-sm pl-4 pr-10 py-2.5 rounded-xl border border-[#D9D1B9] focus:outline-hidden focus:border-[#285F50]"
          />
          <Search className="w-4 h-4 text-[#6F8F69] absolute right-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setSelectedCategory('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              selectedCategory === 'todas'
                ? 'bg-[#285F50] text-[#FAF7E8]'
                : 'bg-[#F4EFD6] text-[#23312C] hover:bg-[#D9D1B9]/50'
            }`}
          >
            Todas ({PRODUCTS.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                selectedCategory === cat.slug
                  ? 'bg-[#285F50] text-[#FAF7E8]'
                  : 'bg-[#F4EFD6] text-[#23312C] hover:bg-[#D9D1B9]/50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-[#6F8F69]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#F4EFD6] border border-[#D9D1B9] text-xs font-bold text-[#23312C] px-3 py-2 rounded-xl focus:outline-hidden"
          >
            <option value="featured">Destacados</option>
            <option value="price-asc">Precio: Menor a Mayor</option>
            <option value="price-desc">Precio: Mayor a Menor</option>
            <option value="rating">Mejor Calificados</option>
          </select>
        </div>

      </div>

      {/* Product List Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#FAF7E8] p-12 text-center rounded-3xl border border-[#D9D1B9] space-y-3">
          <Leaf className="w-12 h-12 text-[#6F8F69] mx-auto opacity-50" />
          <h3 className="font-bold text-lg text-[#23312C]">No encontramos productos que coincidan</h3>
          <p className="text-xs text-[#6F8F69]">Intenta cambiando el término de búsqueda o selecciona otra categoría.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('todas');
            }}
            className="px-4 py-2 bg-[#285F50] text-white text-xs font-bold rounded-xl"
          >
            Limpiar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StoreCatalogPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Cargando catálogo...</div>}>
      <StoreCatalogContent />
    </Suspense>
  );
}
