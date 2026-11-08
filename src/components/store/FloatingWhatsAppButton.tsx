'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getWhatsAppHref } from '@/config/store';
import { useCart } from '@/context/CartContext';
import styles from './FloatingWhatsAppButton.module.css';

export function FloatingWhatsAppButton() {
  const pathname = usePathname();
  const whatsappHref = getWhatsAppHref('Hola, me gustaría recibir asesoría para realizar una compra en Herbolaria en Línea.');
  const { isCartOpen } = useCart();
  // Stay hidden until the footer's position is known, including without IO support.
  const [footerVisible, setFooterVisible] = useState(true);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  const [storeActionsOverlap, setStoreActionsOverlap] = useState(false);
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const excluded = !pathname || ['/operaciones', '/carrito', '/checkout'].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  useEffect(() => {
    if (excluded || !whatsappHref) return;

    const footer = document.querySelector('footer');
    if (!footer || !('IntersectionObserver' in window)) return;

    // The existing footer remains unchanged; its contact links take over here.
    const observer = new IntersectionObserver(([entry]) => {
      setFooterVisible(entry.isIntersecting);
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, [pathname, excluded, whatsappHref]);

  useEffect(() => {
    if (pathname !== '/tienda' || excluded || !whatsappHref || footerVisible || isCartOpen) return;

    let frame = 0;
    const checkOverlap = () => {
      frame = 0;
      const button = buttonRef.current;
      if (!button) return;
      const contact = button.getBoundingClientRect();
      // Mobile cards need clear names, prices and selectors as well as purchase actions.
      // One continuous content area avoids toggling in the gaps between those elements.
      const selector = window.innerWidth < 640 ? '[data-store-product-content]' : '[data-store-product-actions]';
      const overlapping = Array.from(document.querySelectorAll(selector)).some((content) => {
        const rect = content.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 &&
          contact.left < rect.right + 8 && contact.right > rect.left - 8 &&
          contact.top < rect.bottom + 8 && contact.bottom > rect.top - 8;
      });
      setStoreActionsOverlap(overlapping);
    };
    const scheduleCheck = () => {
      if (!frame) frame = window.requestAnimationFrame(checkOverlap);
    };
    checkOverlap();
    window.addEventListener('scroll', scheduleCheck, { passive: true });
    window.addEventListener('resize', scheduleCheck);
    const observer = 'ResizeObserver' in window ? new ResizeObserver(scheduleCheck) : null;
    const main = document.querySelector('main');
    if (main) observer?.observe(main);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleCheck);
      window.removeEventListener('resize', scheduleCheck);
      observer?.disconnect();
    };
  }, [pathname, excluded, whatsappHref, footerVisible, isCartOpen]);

  if (excluded || !whatsappHref || isCartOpen || footerVisible) return null;

  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className={styles.button}
      ref={buttonRef}
      data-store-actions-overlap={pathname === '/tienda' && storeActionsOverlap || undefined}
      data-tooltip-dismissed={tooltipDismissed || undefined}
      onMouseEnter={() => setTooltipDismissed(false)}
      onFocus={() => setTooltipDismissed(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setTooltipDismissed(true);
      }}
    >
      <span className={styles.tooltip} aria-hidden="true">Hablar con un asesor</span>
      <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M20.52 3.48A11.91 11.91 0 0 0 12.06 0C5.48 0 .12 5.35.12 11.94c0 2.1.55 4.16 1.6 5.97L0 24l6.26-1.64a11.92 11.92 0 0 0 5.8 1.48h.01c6.58 0 11.94-5.35 11.94-11.94 0-3.19-1.24-6.19-3.49-8.42ZM12.06 21.82a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.72.98.99-3.63-.23-.37a9.89 9.89 0 0 1-1.52-5.27c0-5.47 4.45-9.92 9.92-9.92a9.85 9.85 0 0 1 7.02 2.91 9.85 9.85 0 0 1 2.9 7.02c0 5.47-4.45 9.92-9.92 9.92Zm5.44-7.43c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35Z" />
      </svg>
    </a>
  );
}
