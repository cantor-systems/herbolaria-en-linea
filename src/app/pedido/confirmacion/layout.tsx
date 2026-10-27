import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Confirmación de pedido', description: 'Confirmación de tu pedido Moronel.', robots: { index: false, follow: false } };
export default function ConfirmationLayout({ children }: { children: React.ReactNode }) { return children; }
