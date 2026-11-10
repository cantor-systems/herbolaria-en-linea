import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireManualDemoAccess } from '@/lib/manual-orders/demo-access';
import { getDemoOrders } from '@/lib/manual-orders/demo-data';
import { DEMO_CHANNELS, demoClassificationLabel, demoMoney, demoPaymentLabel } from '@/lib/manual-orders/demo-types';
import styles from '../demo.module.css';

export default async function DemoOrderDetail({ params }: { params: Promise<{ orderId: string }> }) {
  await requireManualDemoAccess();
  const { orderId } = await params;
  const order = getDemoOrders().find(o => o.id === orderId);
  if (!order) notFound();
  const address = order.shippingAddress;
  return <>
    <Link className={styles.textLink} href="/operaciones/pedidos">← Volver al listado</Link>
    <div className={styles.titleRow}><div><p className={styles.eyebrow}>Detalle de demostración</p><h1 className={styles.heading}>{order.folio}</h1><p className={styles.subtle}>Este ejemplo no representa una operación comercial real.</p></div><span className={styles.badge}>DEMO · Sólo lectura</span></div>
    <div className={styles.detailGrid}><div className={styles.sections}>
      <section className={styles.panel}><h2>Cliente y dirección de envío</h2><p className={styles.intro}>Información completamente ficticia; no disponible para contacto.</p><dl className={styles.detailData}>{Object.entries({ Nombre: order.customer.name, Correo: order.customer.email, Teléfono: `${order.customer.phone} (sintético)`, Clasificación: demoClassificationLabel(order.classification), 'Calle y número': address.streetAddress, Colonia: address.colonia, Ciudad: address.city, Estado: address.state, 'Código postal': address.postalCode, País: address.country }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
      <section className={styles.panel}><h2>Productos y presentaciones</h2><p className={styles.intro}>Precios de referencia calculados por el motor comercial vigente.</p>{order.quote.lines.map(line => <article key={line.key} className={styles.line}><h3><strong>{line.productName}</strong></h3><p>{line.variantLabel}</p><p className={styles.subtle}>{line.packageQuantity} paquete(s) comprado(s) · {line.commercialUnitsPerPackage === null ? 'Contenido según descripción comercial' : `${line.commercialUnitsPerPackage} unidad(es) por presentación · ${line.totalCommercialUnits} en total`}</p><p>{demoMoney(line.subtotalCents)} MXN antes de descuentos</p><span className={styles.badge}>{line.eligibility.eligibility === 'eligible' ? 'Elegible para descuento especial' : 'Excluido de descuento especial'}</span></article>)}</section>
      <section className={styles.panel}><h2>Historial ilustrativo</h2><p className={styles.intro}>Fixtures de interfaz; no son registros de auditoría persistidos.</p><ol className={styles.timeline}><li><time dateTime={order.createdAt}>{order.createdAt.slice(0, 10)}</time>Ejemplo DEMO preparado: {DEMO_CHANNELS[order.channel]}.</li>{order.receivedCents > 0 && <li>Cobertura sintética de {demoMoney(order.receivedCents)} MXN. Sin movimiento bancario.</li>}<li>Estado ilustrativo: {demoPaymentLabel(order)} · {order.fulfillmentStatus === 'shipped' ? 'Enviado' : 'Pendiente de despacho'}.</li></ol></section>
    </div><aside className={`${styles.panel} ${styles.summary}`} aria-label="Resumen del ejemplo"><h2>Resumen DEMO</h2><p className={styles.subtle}>{DEMO_CHANNELS[order.channel]} · {order.origin}</p>{order.otherChannelDetail && <p>{order.otherChannelDetail}</p>}<dl><div><dt>Subtotal</dt><dd>{demoMoney(order.quote.subtotalCents)}</dd></div><div><dt>Descuento normal</dt><dd>−{demoMoney(order.quote.discountCents)}</dd></div><div><dt>Envío estándar</dt><dd>{demoMoney(order.quote.shippingCents)}</dd></div><div className={styles.total}><dt>Total MXN</dt><dd>{demoMoney(order.quote.totalCents)}</dd></div><div><dt>Recibido sintético</dt><dd>{demoMoney(order.receivedCents)}</dd></div><div><dt>Saldo MXN</dt><dd>{demoMoney(order.quote.totalCents - order.receivedCents)}</dd></div></dl><p className={styles.notice}>Pagos, cancelaciones, cambios de estado, despacho y comunicaciones no están disponibles en esta demostración.</p></aside></div>
  </>;
}
