import React from 'react';
import { CreditCard, FileText, Truck, PackageSearch } from 'lucide-react';
import { SHIPPING_CONFIG } from '@/config/shipping';

export const TrustBar: React.FC = () => {
  const items = [
    {
      icon: CreditCard,
      title: 'Pago mediante Mercado Pago',
      subtitle: 'Métodos disponibles al continuar con el pago',
    },
    {
      icon: Truck,
      title: 'Envíos en México',
      subtitle: `Entrega estándar estimada en ${SHIPPING_CONFIG.standardEstimatedDays}`,
    },
    {
      icon: PackageSearch,
      title: 'Rastreo de pedidos',
      subtitle: 'Consulta el estado de tu compra en línea',
    },
    {
      icon: FileText,
      title: 'Información de producto',
      subtitle: 'Consulta ingredientes y modo de uso en cada ficha',
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
