import Link from 'next/link';
import { requireManualDemoAccess } from '@/lib/manual-orders/demo-access';
import { getDemoOrders, filterDemoOrders } from '@/lib/manual-orders/demo-data';
import { DEMO_CHANNELS, demoClassificationLabel, demoMoney, demoPaymentLabel } from '@/lib/manual-orders/demo-types';
import styles from './demo.module.css';

export default async function DemoOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireManualDemoAccess();
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const filters = { q: first(params.q), channel: first(params.channel), payment: first(params.payment) };
  const all = getDemoOrders(), orders = filterDemoOrders(all, filters);
  return <>
    <div className={styles.titleRow}><div><p className={styles.eyebrow}>Captura y seguimiento · DEMO</p><h1 className={styles.heading}>Pedidos en un solo lugar</h1><p className={styles.subtle}>Ejemplos de Tienda en línea, WhatsApp, teléfono y otros canales.</p></div><Link className={styles.button} href="/operaciones/pedidos/nuevo">Nuevo pedido manual</Link></div>
    <div className={styles.stats}><div className={styles.stat}><span>Pedidos sintéticos</span><strong>{all.length}</strong></div><div className={styles.stat}><span>Captura manual</span><strong>{all.filter(o => o.origin === 'manual').length}</strong></div><div className={styles.stat}><span>Con saldo pendiente</span><strong>{all.filter(o => o.status === 'pending_payment').length}</strong></div></div>
    <form className={styles.filters} action="/operaciones/pedidos" method="get" role="search" aria-label="Filtrar pedidos sintéticos">
      <div><label className={styles.label} htmlFor="order-search">Buscar folio o cliente demo</label><input className={styles.input} id="order-search" name="q" defaultValue={filters.q} maxLength={120} placeholder="DEMO-001 o Cliente DEMO" /></div>
      <div><label className={styles.label} htmlFor="channel">Canal</label><select className={styles.input} id="channel" name="channel" defaultValue={filters.channel || 'all'}><option value="all">Todos los canales</option>{Object.entries(DEMO_CHANNELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      <div><label className={styles.label} htmlFor="payment">Estado de pago</label><select className={styles.input} id="payment" name="payment" defaultValue={filters.payment || 'all'}><option value="all">Todos los estados</option><option value="unpaid">Pendiente de pago</option><option value="partial">Pago parcial</option><option value="paid">Pago completo</option></select></div><button className={styles.secondary} type="submit">Aplicar filtros</button>
    </form>
    <p className={styles.subtle} role="status">{orders.length} de {all.length} ejemplos · Filtrado en memoria</p>
    {orders.length ? <><div className={styles.tableWrap}><table className={styles.table}><caption className="sr-only">Pedidos de demostración, sin conexión a datos comerciales</caption><thead><tr>{['Folio / fecha', 'Origen técnico', 'Canal', 'Cliente / clasificación', 'Total MXN', 'Saldo MXN', 'Pago', 'Logística'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{orders.map(o => <tr key={o.id}>
      <td><Link className={styles.textLink} href={`/operaciones/pedidos/${o.id}`}>{o.folio}</Link><small>{new Date(o.createdAt).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' })}</small></td><td>{o.origin}<small>DEMO · sin persistencia</small></td><td>{DEMO_CHANNELS[o.channel]}</td><td>{o.customer.name}<small>{demoClassificationLabel(o.classification)}</small></td><td>{demoMoney(o.quote.totalCents)}</td><td>{demoMoney(o.quote.totalCents - o.receivedCents)}</td><td><span className={`${styles.badge} ${o.status === 'approved' ? styles.positive : styles.pending}`}>{demoPaymentLabel(o)}</span></td><td><span className={styles.badge}>{o.fulfillmentStatus === 'shipped' ? 'Enviado' : 'Pendiente'}</span></td>
    </tr>)}</tbody></table></div><div className={styles.cards}>{orders.map(o => <article className={styles.panel} key={o.id}><div className={styles.lineTop}><Link className={styles.textLink} href={`/operaciones/pedidos/${o.id}`}>{o.folio}</Link><span className={styles.badge}>DEMO</span></div><h2>{o.customer.name}</h2><p className={styles.subtle}>{demoClassificationLabel(o.classification)}</p><dl className={styles.detailData}><div><dt>Origen técnico</dt><dd>{o.origin}</dd></div><div><dt>Canal</dt><dd>{DEMO_CHANNELS[o.channel]}</dd></div><div><dt>Fecha</dt><dd>{o.createdAt.slice(0, 10)}</dd></div><div><dt>Total MXN</dt><dd>{demoMoney(o.quote.totalCents)}</dd></div><div><dt>Saldo MXN</dt><dd>{demoMoney(o.quote.totalCents - o.receivedCents)}</dd></div><div><dt>Pago</dt><dd>{demoPaymentLabel(o)}</dd></div><div><dt>Logística</dt><dd>{o.fulfillmentStatus === 'shipped' ? 'Enviado' : 'Pendiente'}</dd></div></dl></article>)}</div></> : <div className={styles.empty}><h2>No hay ejemplos con esos filtros</h2><Link className={styles.textLink} href="/operaciones/pedidos">Limpiar filtros</Link></div>}
    <p className={styles.footerNote}>Vista completa de fixtures sintéticos. La paginación y la consulta de pedidos reales no están implementadas.</p>
  </>;
}
