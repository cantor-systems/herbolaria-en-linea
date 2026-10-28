'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Leaf,
  ShoppingBag,
  Search,
  Menu,
  X,
  User,
  Truck,
  MessageCircle,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { STORE_CONFIG, getWhatsAppHref } from '@/config/store';
import { useCart } from '@/context/CartContext';
import { trackWhatsAppClick } from '@/lib/analytics';

export const Header: React.FC = () => {
  const router = useRouter();
  const { setIsCartOpen, cartCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [conocerMenuOpen, setConocerMenuOpen] = useState(false);
  const [diseasesMenuOpen, setDiseasesMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/tienda?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#F4EFD6]/95 backdrop-blur-md border-b border-[#D9D1B9] shadow-xs w-full max-w-full overflow-visible">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">

          {/* Logo & Brand Name */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#285F50] text-[#FAF7E8] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
              <Leaf className="w-5 h-5 sm:w-6 sm:h-6 text-[#D17B24]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base sm:text-xl font-extrabold tracking-tight text-[#285F50] leading-tight truncate">
                {STORE_CONFIG.logo.text}{' '}
                <span className="text-[#98552B] font-semibold text-sm sm:text-lg">
                  {STORE_CONFIG.logo.tagline}
                </span>
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-[#6F8F69] tracking-wider uppercase truncate">
                Productos <span className="text-[#D17B24] font-bold">{STORE_CONFIG.brandName}</span>
              </span>
            </div>
          </Link>

          {/* Desktop Search */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xs lg:max-w-md relative">
            <input
              type="text"
              placeholder="Buscar gotas, cápsulas, hierba..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF7E8] text-[#23312C] text-sm pl-4 pr-10 py-2 rounded-full border border-[#D9D1B9] focus:outline-hidden focus:border-[#285F50] focus:ring-1 focus:ring-[#285F50] transition-all"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F8F69] hover:text-[#285F50]"
              aria-label="Buscar"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Nav Links Desktop */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-[#23312C]">
            <Link href="/" className="hover:text-[#285F50] transition-colors">
              Inicio
            </Link>
            <Link href="/tienda" className="hover:text-[#285F50] transition-colors">
              Tienda
            </Link>
            <div className="relative" onMouseEnter={() => setConocerMenuOpen(true)} onMouseLeave={() => setConocerMenuOpen(false)}>
              <div className="flex items-center gap-1"><Link href="/conocer-moronel" className="hover:text-[#285F50] transition-colors">Conocer Moronel</Link><button type="button" onClick={() => setConocerMenuOpen((open) => !open)} onKeyDown={(event) => { if (event.key === 'Escape') setConocerMenuOpen(false); }} aria-expanded={conocerMenuOpen} aria-haspopup="menu" aria-controls="conocer-moronel-menu" className="p-1 rounded focus-visible:outline-2 focus-visible:outline-[#D17B24]"><ChevronDown className="w-4 h-4" /></button></div>
              {conocerMenuOpen && <div id="conocer-moronel-menu" className="absolute z-[60] top-full left-0 w-52 pt-2"><div className="rounded-xl border border-[#D9D1B9] bg-[#FAF7E8] p-2 shadow-lg"><Link href="/conocer-moronel/moronel-te" className="block rounded-lg px-3 py-2 hover:bg-[#F4EFD6]">Moronel Té</Link><Link href="/conocer-moronel/moronel-gotas" className="block rounded-lg px-3 py-2 hover:bg-[#F4EFD6]">Moronel Gotas</Link><Link href="/conocer-moronel/moronel-capsulas" className="block rounded-lg px-3 py-2 hover:bg-[#F4EFD6]">Moronel Cápsulas</Link></div></div>}
            </div>
            <div className="relative" onMouseEnter={() => setDiseasesMenuOpen(true)} onMouseLeave={() => setDiseasesMenuOpen(false)}>
              <div className="flex items-center gap-1"><span className="text-[#23312C]">Enfermedades</span><button type="button" onClick={() => setDiseasesMenuOpen((open) => !open)} onKeyDown={(event) => { if (event.key === 'Escape') setDiseasesMenuOpen(false); }} aria-expanded={diseasesMenuOpen} aria-haspopup="menu" aria-controls="diseases-menu" className="p-1 rounded focus-visible:outline-2 focus-visible:outline-[#D17B24]"><ChevronDown className="w-4 h-4" /></button></div>
              {diseasesMenuOpen && <div id="diseases-menu" className="absolute z-[60] top-full left-0 w-60 pt-2"><div className="rounded-xl border border-[#D9D1B9] bg-[#FAF7E8] p-2 shadow-lg"><Link href="/enfermedades/moronel-para-el-cancer" className="block rounded-lg px-3 py-2 hover:bg-[#F4EFD6]">Moronel para el cáncer</Link><Link href="/enfermedades/moronel-para-la-diabetes" className="block rounded-lg px-3 py-2 hover:bg-[#F4EFD6]">Moronel para la diabetes</Link></div></div>}
            </div>
            <Link href="/blog" className="hover:text-[#285F50] transition-colors">
              Blog
            </Link>
          </nav>

          {/* Action Icons & Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* WhatsApp Quick Link */}
            <a
              href={getWhatsAppHref() || undefined}
              target={STORE_CONFIG.contact.whatsapp.enabled ? '_blank' : undefined}
              rel={STORE_CONFIG.contact.whatsapp.enabled ? 'noopener noreferrer' : undefined}
              aria-disabled={!STORE_CONFIG.contact.whatsapp.enabled}
              onClick={() => trackWhatsAppClick('header', { placement: 'header' })}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 transition-colors"
              title="Atención directa por WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </a>

            {/* Account Icon */}
            <Link
              href="/mi-cuenta"
              className="p-2 text-[#23312C] hover:text-[#285F50] hover:bg-[#FAF7E8] rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Mi Cuenta"
            >
              <User className="w-5 h-5" />
            </Link>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 bg-[#285F50] text-[#FAF7E8] hover:bg-[#23312C] rounded-full transition-transform active:scale-95 shadow-md flex items-center justify-center min-w-[44px] min-h-[44px]"
              aria-label="Abrir carrito de compras"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#D17B24] text-white font-extrabold text-[11px] rounded-full flex items-center justify-center border-2 border-[#F4EFD6] animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 lg:hidden text-[#23312C] hover:text-[#285F50] rounded-lg focus:outline-hidden min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label="Menú principal"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div id="mobile-navigation" className="lg:hidden py-4 border-t border-[#D9D1B9] animate-in fade-in duration-200 max-w-full overflow-hidden">
            <form onSubmit={handleSearchSubmit} className="mb-4 relative">
              <input
                type="text"
                placeholder="Buscar en Herbolaria en Línea..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FAF7E8] text-[#23312C] text-sm pl-4 pr-10 py-2.5 rounded-full border border-[#D9D1B9]"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F8F69]"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            <div className="flex flex-col gap-2 font-semibold text-[#23312C] text-base">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-[#FAF7E8]"
              >
                Inicio
              </Link>
              <Link
                href="/tienda"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-[#FAF7E8] text-[#285F50] font-bold"
              >
                Tienda y Catálogo
              </Link>
              <Link
                href="/categoria/moronel-gotas"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-[#FAF7E8] pl-6 text-sm text-[#6F8F69]"
              >
                • Moronel en Gotas
              </Link>
              <Link
                href="/categoria/moronel-capsulas"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-[#FAF7E8] pl-6 text-sm text-[#6F8F69]"
              >
                • Moronel en Cápsulas
              </Link>
              <Link
                href="/categoria/moronel-hierba"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-[#FAF7E8] pl-6 text-sm text-[#6F8F69]"
              >
                • Moronel en Hierba
              </Link>
              <Link
                href="/categoria/paquetes-y-promociones"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-[#FAF7E8] pl-6 text-sm text-[#D17B24] font-bold"
              >
                • Paquetes y Promociones
              </Link>
              <Link
                href="/conocer-moronel"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-[#FAF7E8]"
              >
                Conocer Moronel
              </Link>
              <Link href="/conocer-moronel/moronel-te" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-[#FAF7E8] pl-8 text-sm text-[#6F8F69]">• Moronel Té</Link>
              <Link href="/conocer-moronel/moronel-gotas" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-[#FAF7E8] pl-8 text-sm text-[#6F8F69]">• Moronel Gotas</Link>
              <Link href="/conocer-moronel/moronel-capsulas" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-[#FAF7E8] pl-8 text-sm text-[#6F8F69]">• Moronel Cápsulas</Link>
              <span className="px-3 py-2.5 font-bold">Enfermedades</span>
              <Link href="/enfermedades/moronel-para-el-cancer" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-[#FAF7E8] pl-8 text-sm text-[#6F8F69]">• Moronel para el cáncer</Link>
              <Link href="/enfermedades/moronel-para-la-diabetes" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-[#FAF7E8] pl-8 text-sm text-[#6F8F69]">• Moronel para la diabetes</Link>
              <Link
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-[#FAF7E8]"
              >
                Blog Herbolario
              </Link>
              <Link
                href="/rastrear-pedido"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-[#FAF7E8] flex items-center gap-2"
              >
                <Truck className="w-4 h-4 text-[#D17B24]" />
                <span>Rastrear Pedido</span>
              </Link>
              <Link
                href="/preguntas-frecuentes"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-[#FAF7E8] flex items-center gap-2 text-sm text-stone-600"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Preguntas Frecuentes</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
