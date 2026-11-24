import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/store/StorefrontShell';
export const metadata: Metadata = { title: 'Mi cuenta', description: 'Consulta la información de tu cuenta en Herbolaria en Línea.', robots: { index: false, follow: false } };
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
