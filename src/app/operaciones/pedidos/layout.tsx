import type { Metadata } from 'next';
import Link from 'next/link';
import { requireManualDemoAccess } from '@/lib/manual-orders/demo-access';
import styles from './demo.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Pedidos · Demostración privada', robots: { index: false, follow: false } };

export default async function ManualOrdersLayout({ children }: { children: React.ReactNode }) {
  await requireManualDemoAccess();
  return <section className={styles.shell}>
    <header className={styles.bar}><div className={styles.barInner}>
      <div><p className={styles.brand}>Herbolaria en Línea · Operaciones</p><p><strong>Pedidos · DEMO</strong></p></div>
      <nav className={styles.nav} aria-label="Pedidos de demostración"><Link href="/operaciones/pedidos">Listado</Link><Link href="/operaciones/pedidos/nuevo">Nuevo pedido demo</Link></nav>
    </div></header>
    <div className={styles.content}><p className={styles.banner} role="note"><strong>Demostración privada.</strong> Sólo datos sintéticos. No guarda pedidos, registra pagos, despacha ni envía comunicaciones. Utiliza únicamente información ficticia.</p>{children}</div>
  </section>;
}
