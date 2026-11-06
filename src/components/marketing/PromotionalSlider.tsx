'use client';

import { useEffect, useId, useState, type CSSProperties, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import type { PromotionalSlide } from '@/content/promotional-slides';
import styles from './PromotionalSlider.module.css';

export const PROMOTIONAL_AUTOPLAY_MS = 6000;

export function PromotionalSlider({ slides }: { slides: readonly PromotionalSlide[] }) {
  const regionId = useId();
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(true);
  const multiple = slides.length > 1;
  const current = Math.min(index, Math.max(0, slides.length - 1));
  const rotating = ready && multiple && !paused && !hovered && !focused && !reducedMotion && visible;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    setReady(true);
    media.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      media.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), PROMOTIONAL_AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [rotating, slides.length]);

  function select(next: number) {
    setPaused(true);
    setIndex((next + slides.length) % slides.length);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!multiple || event.altKey || event.ctrlKey || event.metaKey) return;
    const destination = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: slides.length - 1 }[event.key];
    if (destination !== undefined) {
      event.preventDefault();
      select(destination);
    }
  }

  if (!slides.length) return null;

  return (
    <div className={styles.container}>
      <section
        className={styles.slider}
        role="region"
        aria-roledescription="carrusel"
        aria-label="Destacados de Herbolaria en Línea"
        onKeyDown={onKeyDown}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
        onPointerDown={(event) => { if (!(event.target as HTMLElement).closest('button')) setPaused(true); }}
        data-promotional-slider
      >
        <div id={regionId} className={styles.slides} aria-live={rotating ? 'off' : 'polite'} aria-atomic="true">
          {slides.map((slide, position) => (
            <article
              key={slide.id}
              className={`${styles.slide}${slide.copyPosition === 'right' ? ` ${styles.copyRight}` : ''}`}
              hidden={position !== current}
              role="group"
              aria-roledescription="diapositiva"
              aria-label={`${position + 1} de ${slides.length}`}
              data-slide-id={slide.id}
            >
              {/* Only the current image is requested. The first one also works without JS. */}
              {position === current && (
                <picture className={styles.picture}>
                  {slide.mobileImage && <source media="(max-width: 639px)" srcSet={slide.mobileImage} />}
                  <img
                    src={slide.desktopImage}
                    alt={slide.alt}
                    width={1200}
                    height={520}
                    loading={position === 0 ? 'eager' : 'lazy'}
                    fetchPriority={position === 0 ? 'high' : 'low'}
                    decoding="async"
                    className={styles.image}
                    style={{ '--image-position': slide.imagePosition ?? 'center', '--mobile-image-position': slide.mobileImagePosition ?? 'center' } as CSSProperties}
                  />
                </picture>
              )}
              <div className={styles.shade} />
              {slide.previewOnly && <p className={styles.reference}>Preview · Imagen de referencia</p>}
              <div className={styles.copy}>
                <p className={styles.eyebrow}>{slide.eyebrow}</p>
                <h2 className={styles.headline}>{slide.headline}</h2>
                <Link href={slide.href} className={styles.cta} prefetch={false}>
                  {slide.ctaText}<ArrowRight size={22} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        {multiple && ready && (
          <>
            <button type="button" className={`${styles.control} ${styles.previous}`} aria-label="Banner anterior" aria-controls={regionId} onClick={() => select(current - 1)}>
              <ArrowLeft size={22} aria-hidden="true" />
            </button>
            <button type="button" className={`${styles.control} ${styles.next}`} aria-label="Banner siguiente" aria-controls={regionId} onClick={() => select(current + 1)}>
              <ArrowRight size={22} aria-hidden="true" />
            </button>
            <div className={styles.bottomControls}>
              <div className={styles.indicators} aria-label="Seleccionar banner">
                {slides.map((slide, position) => (
                  <button key={slide.id} type="button" className={styles.indicator} aria-label={`Ver banner ${position + 1}: ${slide.eyebrow}`} aria-current={position === current ? 'true' : undefined} aria-controls={regionId} onClick={() => select(position)}>
                    <span />
                  </button>
                ))}
              </div>
              {!reducedMotion && (
                <button type="button" className={styles.playback} aria-label={paused ? 'Reanudar cambio automático' : 'Pausar cambio automático'} onClick={() => setPaused((value) => !value)}>
                  {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
