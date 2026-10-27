import type { Metadata } from 'next';
import { canonicalAlternates, socialMetadata } from '@/lib/site';
export const metadata: Metadata = { title: 'Contacto', description: 'Contacta a Moronel Planta de la Vida para resolver dudas sobre productos, pedidos y envíos.', ...canonicalAlternates('/contacto'), ...socialMetadata('/contacto', 'Contacto', 'Contacta a Moronel Planta de la Vida para resolver dudas sobre productos, pedidos y envíos.') };
export default function ContactLayout({ children }: { children: React.ReactNode }) { return children; }
