import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/store/StorefrontShell';
export const metadata: Metadata = { title: 'Finalizar pedido', description: 'Completa los datos de tu pedido en Herbolaria en Línea.', robots: { index: false, follow: false } };
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
