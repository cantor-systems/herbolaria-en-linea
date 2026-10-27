import React from 'react';
import { ShieldCheck, Truck, MessageSquare, Award } from 'lucide-react';
import { SHIPPING_CONFIG } from '@/config/shipping';

export const TrustBar: React.FC = () => {
  const items = [
    {
      icon: Truck,
      title: 'Envíos Nacionales',
      subtitle: `${SHIPPING_CONFIG.standardEstimatedDays} a todo México`,
    },
    {
      icon: ShieldCheck,
      title: 'Pagos en línea seguros',
      subtitle: 'En efectivo y con tarjeta de crédito o débito',
    },
    {
      icon: Award,
      title: 'Productos Herbazen',
      subtitle: '100% de origen natural seleccionado',
    },
    {
      icon: MessageSquare,
      title: 'Atención Directa',
      subtitle: 'Contamos con asesores especializados para ti',
    },
  ];

  return (
    <section className="bg-[#FAF7E8] border-y border-[#D9D1B9] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex flex-col items-center p-2">
                <div className="w-12 h-12 rounded-2xl bg-[#285F50]/10 text-[#285F50] flex items-center justify-center mb-3">
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-[#23312C] text-sm sm:text-base leading-tight mb-1">
                  {item.title}
                </h4>
                <p className="text-xs text-[#6F8F69] font-medium leading-relaxed">
                  {item.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
