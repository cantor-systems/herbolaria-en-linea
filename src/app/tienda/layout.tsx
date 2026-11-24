import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/store/StorefrontShell';
import { canonicalAlternates, socialMetadata } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Tienda de productos Moronel',
  description: 'Explora las presentaciones disponibles de Moronel en hierba deshidratada, gotas y cápsulas para comprar en línea en México.',
  ...canonicalAlternates('/tienda'),
  ...socialMetadata('/tienda', 'Tienda de productos Moronel', 'Explora las presentaciones disponibles de Moronel en hierba deshidratada, gotas y cápsulas para comprar en línea en México.'),
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
