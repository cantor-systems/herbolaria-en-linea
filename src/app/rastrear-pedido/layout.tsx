import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Rastrear pedido', description: 'Consulta el estado de tu pedido Moronel.', robots: { index: false, follow: false } };
export default function TrackingLayout({ children }: { children: React.ReactNode }) { return children; }
