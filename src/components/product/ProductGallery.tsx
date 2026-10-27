'use client';

import React from 'react';

interface ProductGalleryProps {
  images: string[];
  productName: string;
  selectedImage: string;
  onSelectImage: (image: string) => void;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  productName,
  selectedImage,
  onSelectImage,
}) => {
  const activeImage = selectedImage || images[0] || '';

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="aspect-square bg-[#F4EFD6] rounded-2xl border border-[#D9D1B9] overflow-hidden shadow-sm relative group">
        {activeImage && (
          <img
            src={activeImage}
            alt={productName}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectImage(img)}
              className={`w-20 h-20 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
                activeImage === img
                  ? 'border-[#285F50] ring-2 ring-[#285F50]/30 shadow-md scale-105'
                  : 'border-[#D9D1B9] opacity-75 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`${productName} vista ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
