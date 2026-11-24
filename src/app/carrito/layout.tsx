import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/store/StorefrontShell';
export const metadata: Metadata = { title: 'Carrito de compras', description: 'Revisa los productos seleccionados antes de continuar con tu pedido.', robots: { index: false, follow: false } };
export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
