import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Finalizar pedido', description: 'Completa los datos de tu pedido de Moronel.', robots: { index: false, follow: false } };
export default function CheckoutLayout({ children }: { children: React.ReactNode }) { return children; }
