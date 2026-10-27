import React from 'react';
import { Truck, ShieldCheck, MessageCircle } from 'lucide-react';
import { SHIPPING_CONFIG } from '@/config/shipping';
import { STORE_CONFIG } from '@/config/store';

export const TopAnnouncementBar: React.FC = () => {
  return (
    <div className="bg-[#23312C] text-[#F4EFD6] text-xs py-2 px-3 sm:px-6 flex flex-wrap items-center justify-between border-b border-[#285F50] w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
        <div className="flex items-center gap-2 font-medium">
          <Truck className="w-3.5 h-3.5 text-[#AFC28E] shrink-0" />
          <span>
            Envíos a todo México · Gratis en compras desde ${SHIPPING_CONFIG.freeShippingThresholdCents / 100} MXN
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-[#C9AD83]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D17B24]" />
            <span>Pago seguro en línea con Mercado Pago</span>
          </div>
          {!STORE_CONFIG.contact.whatsapp.enabled && (
            <div className="flex items-center gap-1.5 text-[#FAF7E8]">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
