export type PresentationKey = 'te' | 'gotas' | 'capsulas';

export const MORONEL_PRESENTATIONS = {
  te: { title: 'Moronel Té', eyebrow: 'PRESENTACIÓN TRADICIONAL', subtitle: 'La presentación tradicional de Moronel en hierba deshidratada para preparar infusiones.', productSlug: 'moronel-hierba-240g', image: '/images/products/moronel-hierba-deshidratada.webp', amount: '240 g por bolsa', characteristics: ['Hierba deshidratada', 'Formato tradicional', 'Preparación en infusión', 'Disponible en diferentes paquetes'], usage: 'La preparación debe seguir las indicaciones vigentes del producto y su etiquetado. De forma general, se calienta agua, se incorpora la cantidad indicada, se deja reposar y se cuela cuando corresponde.' },
  gotas: { title: 'Moronel Gotas', eyebrow: 'EXTRACTO LÍQUIDO', subtitle: 'Extracto líquido de Moronel en una presentación compacta de 50 ml con gotero.', productSlug: 'moronel-gotas-50ml', image: '/images/products/moronel-gotas-50ml.webp', amount: '50 ml por frasco', characteristics: ['Extracto líquido', 'Presentación compacta', 'Gotero', 'Fácil de transportar', 'No requiere preparación tradicional'], usage: 'La cantidad y frecuencia deben seguir las indicaciones vigentes del producto y su etiquetado. El formato se utiliza mediante el gotero incluido, sin requerir una preparación tradicional.' },
  capsulas: { title: 'Moronel Cápsulas', eyebrow: 'FORMATO PRÁCTICO', subtitle: 'Moronel en cápsulas vegetales, en una presentación práctica de 60 cápsulas por frasco.', productSlug: 'moronel-capsulas-60-capsulas', image: '/images/products/moronel-capsulas-100.webp', amount: '60 cápsulas por frasco', characteristics: ['Cápsulas vegetales', 'Presentación portátil', 'No requiere preparación', 'Disponible en diferentes paquetes'], usage: 'La cantidad diaria debe seguir las indicaciones vigentes del producto y su etiquetado. Este formato no requiere preparar una bebida.' },
} as const;

export const PRESENTATION_TESTIMONIALS = [
  { id: 'moronel-te-01', presentation: 'te', name: 'Sonia Bejarano Sgbv', quote: 'Enserio muy bueno, tengo una semana tomándolo no siento la gastritis', rating: 5 },
  { id: 'moronel-te-02', presentation: 'te', name: 'Jaime Rene Acosta G.', quote: 'No es fraude yo soy de villahermosa y si me llego el paquete ya lo empeze a tomar', rating: 5 },
  { id: 'moronel-gotas-01', presentation: 'gotas', name: 'Felipe Sánchez', quote: 'Ami me llegó y gracias a Dios e tenido cambio', rating: 5 },
  { id: 'moronel-gotas-02', presentation: 'gotas', name: 'Blanquita Heredia', quote: 'Super recomendable 👌👍', rating: 5 },
  { id: 'moronel-capsulas-01', presentation: 'capsulas', name: 'Jaime Rene Acosta G.', quote: 'No es fraude yo soy de villahermosa y si me llego el paquete ya lo empeze a tomar', rating: 5 },
  { id: 'moronel-capsulas-02', presentation: 'capsulas', name: 'Clara Clara', quote: 'Buenísimo yo lo tomo😀', rating: 5 },
] as const;
