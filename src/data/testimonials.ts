import { Testimonial } from '@/types';

export const SHOW_MOCK_TESTIMONIALS = false;

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'test-1',
    authorName: 'María Elena R.',
    location: 'Guadalajara, Jal.',
    verifiedPurchase: true,
    rating: 5,
    productName: 'Moronel Extracto Concentrado en Gotas',
    comment:
      'Llegó súper rápido por paquetería y el empaque muy bien protegido. Llevo 3 semanas tomando las gotas y me he sentido muy a gusto. Muy buena atención por WhatsApp.',
    date: '14 de Octubre, 2025',
    isMock: true,
    isVerified: false,
    requiresValidation: true,
  },
  {
    id: 'test-2',
    authorName: 'Carlos A. Mendoza',
    location: 'Monterrey, N.L.',
    verifiedPurchase: true,
    rating: 5,
    productName: 'Paquete Moronel Integral',
    comment:
      'Compré el kit completo para probar las tres presentaciones. Las cápsulas son muy prácticas para llevar al trabajo. El envío fue gratis por superar el monto mínimo.',
    date: '28 de Noviembre, 2025',
    isMock: true,
    isVerified: false,
    requiresValidation: true,
  },
  {
    id: 'test-3',
    authorName: 'Lucía Fernández V.',
    location: 'Puebla, Pue.',
    verifiedPurchase: true,
    rating: 5,
    productName: 'Moronel en Cápsulas Vegetales',
    comment:
      'Excelente presentación de la marca Herbazen. Las cápsulas no dejan sabor amargo. Volveré a pedir el paquete de 3 frascos para aprovechar el descuento.',
    date: '05 de Enero, 2026',
    isMock: true,
    isVerified: false,
    requiresValidation: true,
  },
  {
    id: 'test-4',
    authorName: 'Roberto Gómez G.',
    location: 'Querétaro, Qro.',
    verifiedPurchase: true,
    rating: 5,
    productName: 'Moronel Hierba Orgánica Deshidratada',
    comment:
      'Me gusta preparar el té por la mañana. La hierba viene limpia, bien seca y con aroma fresco. Todo el proceso de compra con seguimiento fue impecable.',
    date: '18 de Febrero, 2026',
    isMock: true,
    isVerified: false,
    requiresValidation: true,
  },
];
