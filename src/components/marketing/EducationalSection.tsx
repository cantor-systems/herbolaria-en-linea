import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { HOMEPAGE_CONTENT } from '@/content/homepage';

export const EducationalSection: React.FC = () => {
  const content = HOMEPAGE_CONTENT.educational;

  return (
    <section aria-labelledby="educational-title" className="py-8 sm:py-10 lg:py-12 bg-[#FAF7E8] border-y border-[#D9D1B9]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
          <div className="aspect-[16/10] lg:aspect-[4/3] rounded-2xl overflow-hidden border border-[#D9D1B9]/60 bg-[#F4EFD6]">
            <img
              src={content.image.src}
              alt={content.image.alt}
              width={content.image.width}
              height={content.image.height}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover object-[18%_center]"
            />
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-[#285F50]">
              <BookOpen className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              <span>{content.eyebrow}</span>
            </div>

            <h2 id="educational-title" className="text-2xl sm:text-3xl xl:text-4xl font-semibold text-[#23312C] leading-tight tracking-tight">
              {content.title}
            </h2>

            <p className="text-base sm:text-lg font-medium leading-relaxed text-[#53645B]">
              {content.subtitle}
            </p>

            <p className="text-sm sm:text-base leading-7 text-[#53645B]">
              {content.introduction}
            </p>

            <Link
              href={content.cta.href}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#285F50] hover:bg-[#23312C] text-[#FAF7E8] text-sm font-semibold rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#285F50]"
            >
              <span>{content.cta.text}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
