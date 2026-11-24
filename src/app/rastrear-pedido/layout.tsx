import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/store/StorefrontShell';
export const metadata: Metadata = { title: 'Rastrear pedido', description: 'Consulta el estado de tu pedido en Herbolaria en Línea.', robots: { index: false, follow: false } };
export default function TrackingLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
