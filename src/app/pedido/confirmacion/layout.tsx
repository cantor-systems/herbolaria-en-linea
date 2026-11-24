import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/store/StorefrontShell';
export const metadata: Metadata = { title: 'Confirmación de pedido', description: 'Confirmación de tu pedido en Herbolaria en Línea.', robots: { index: false, follow: false } };
export default function ConfirmationLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
