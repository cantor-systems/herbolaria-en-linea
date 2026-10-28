import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Mi cuenta', description: 'Consulta la información de tu cuenta en Herbolaria en Línea.', robots: { index: false, follow: false } };
export default function AccountLayout({ children }: { children: React.ReactNode }) { return children; }
