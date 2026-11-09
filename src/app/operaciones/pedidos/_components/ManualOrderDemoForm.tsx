'use client';
import { useActionState, useId, useState, type ReactNode } from 'react';
import { DEMO_INITIAL_STATE, demoMoney, type DemoCatalogProduct, type DemoQuoteState } from '@/lib/manual-orders/demo-types';
import styles from '../demo.module.css';

type DraftLine = { key: number; productId: string; variantId: string; quantity: string };
type Props = { catalog: DemoCatalogProduct[]; defaults: Record<string, string>; quoteAction: (previous: DemoQuoteState, form: FormData) => Promise<DemoQuoteState> };
function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return <div><label className={styles.label} htmlFor={id}>{label}</label>{children}{hint && <small className={styles.hint} id={`${id}-hint`}>{hint}</small>}{error && <span className={styles.error} id={`${id}-error`}>{error}</span>}</div>;
}
function CatalogProduct({ product, add, atLimit }: { product: DemoCatalogProduct; add: (productId: string, variantId: string) => void; atLimit: boolean }) {
  const id = useId();
  const [variantId, setVariantId] = useState(product.variants[0]?.variantId ?? '');
  const variant = product.variants.find(v => v.variantId === variantId);
  return <article className={styles.product}><strong>{product.productName}</strong>
    <label className={styles.label} htmlFor={id}>Presentación de {product.productName}</label>
    <select className={styles.input} id={id} value={variantId} data-quote-ignore="true" onChange={e => setVariantId(e.target.value)}>{product.variants.map(v => <option value={v.variantId} key={v.variantId}>{v.variantLabel} · {demoMoney(v.priceCents)} MXN</option>)}</select>
    <p className={styles.hint}>{variant?.eligibility.eligibility === 'eligible' ? 'Individual regular · Elegible para descuento especial' : 'Promoción, kit u otra presentación excluida de descuento especial'}</p>
    <button className={styles.secondary} type="button" disabled={!variant?.selectable || atLimit} onClick={() => add(product.productId, variantId)}>{!variant?.selectable ? 'No disponible' : atLimit ? 'Límite de 50 líneas' : 'Añadir presentación'}</button>
  </article>;
}

export function ManualOrderDemoForm({ catalog, defaults, quoteAction }: Props) {
  const [result, action, pending] = useActionState(quoteAction, DEMO_INITIAL_STATE);
  const [revision, setRevision] = useState(0);
  const [reviewed, setReviewed] = useState(false);
  const [channel, setChannel] = useState('whatsapp');
  const [relationship, setRelationship] = useState('customer');
  const [frequency, setFrequency] = useState('new');
  const [segment, setSegment] = useState('retail');
  const [shipping, setShipping] = useState('standard');
  const [discount, setDiscount] = useState('normal');
  const [courtesy, setCourtesy] = useState(false);
  const [search, setSearch] = useState('');
  // Controlled fields preserve the reviewed intent across React's action form reset.
  const [values, setValues] = useState<Record<string, string>>({ ...defaults, otherChannelDetail: 'Canal sintético de demostración', discountPercent: '35', discountReason: '', courtesyReason: '' });
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const fresh = result.revision === String(revision);
  const quote = fresh ? result.quote : null, normal = fresh ? result.normal : null;
  const errors = fresh ? result.errors : {};
  const filtered = catalog.filter(p => `${p.productName} ${p.productSlug}`.toLocaleLowerCase('es-MX').includes(search.trim().toLocaleLowerCase('es-MX')));
  function changed() { setRevision(v => v + 1); setReviewed(false); }
  function add(productId: string, variantId: string) {
    if (lines.length >= 50) return;
    setLines([...lines, { key: nextKey, productId, variantId, quantity: '1' }]); setNextKey(v => v + 1); changed();
  }
  function props(name: string, hint = false) {
    return { id: name, name, className: styles.input, 'aria-invalid': errors[name] ? true as const : undefined,
      'aria-describedby': [hint ? `${name}-hint` : '', errors[name] ? `${name}-error` : ''].filter(Boolean).join(' ') || undefined };
  }
  function input(name: string, label: string, value: string, hint?: string, type = 'text', maxLength = 120) {
    return <Field id={name} label={label} error={errors[name]} hint={hint}><input {...props(name, !!hint)} type={type} value={values[name] ?? value} onChange={e => setValues(v => ({ ...v, [name]: e.target.value }))} inputMode={name === 'postalCode' ? 'numeric' : undefined} required={name !== 'customerEmail'} maxLength={maxLength} autoComplete="off" /></Field>;
  }
  const blocking = quote?.blockingReasons ?? [];
  return <form action={action} onChange={event => { if (!(event.target as HTMLElement).dataset.quoteIgnore) changed(); }}>
    <input type="hidden" name="revision" value={revision} />
    <input type="hidden" name="items" value={JSON.stringify(lines.map(l => ({ productId: l.productId, variantId: l.variantId, packageQuantity: Number(l.quantity) })))} />
    {fresh && Object.keys(errors).length > 0 && <div className={styles.notice} role="alert" tabIndex={-1}><strong>Revisa los siguientes campos</strong><ul>{Object.entries(errors).map(([key, message]) => <li key={key}>{key !== 'form' ? <a className={styles.textLink} href={`#${key}`}>{message}</a> : message}</li>)}</ul></div>}
    <div className={styles.formGrid}><fieldset className={styles.sections} disabled={pending} style={{ border: 0, padding: 0, margin: 0 }}><legend className="sr-only">Datos ficticios del pedido manual</legend>
      <section className={styles.panel}><h2>1. Canal de venta</h2><p className={styles.intro}>Una captura manual nunca se identifica como Tienda en línea.</p><div className={styles.fields}>
        <Field id="channel" label="Canal *" error={errors.channel}><select {...props('channel')} value={channel} onChange={e => setChannel(e.target.value)}><option value="whatsapp">WhatsApp</option><option value="phone">Teléfono</option><option value="other">Otro</option></select></Field>
        {channel === 'other' && input('otherChannelDetail', 'Describe el canal *', 'Canal sintético de demostración')}
      </div></section>
      <section className={styles.panel}><h2>2. Cliente y clasificación</h2><p className={styles.intro}>No introduzcas datos personales reales. Los contactos demo no se utilizan para comunicaciones.</p><div className={styles.fields}>
        {input('customerName', 'Nombre ficticio *', defaults.customerName, 'Incluye DEMO en el nombre.')}
        {input('customerPhone', 'Teléfono sintético *', defaults.customerPhone, 'Rango de prueba: 5500000000–5500009999.', 'tel', 10)}
        {input('customerEmail', 'Correo ficticio (opcional)', defaults.customerEmail, 'Sólo direcciones terminadas en .invalid.', 'email', 150)}
        <Field id="relationship" label="Relación comercial *" error={errors.relationship}><select {...props('relationship')} value={relationship} onChange={e => setRelationship(e.target.value)}><option value="prospect">Prospecto</option><option value="customer">Cliente</option></select></Field>
        <Field id="frequency" label={relationship === 'prospect' ? 'Frecuencia' : 'Frecuencia *'} error={errors.frequency}><select {...props('frequency')} disabled={relationship === 'prospect'} value={frequency} onChange={e => setFrequency(e.target.value)}><option value="new">Nuevo</option><option value="frequent">Frecuente</option></select>{relationship === 'prospect' && <small className={styles.hint}>No aplica a prospectos.</small>}</Field>
        <Field id="segment" label="Segmento comercial *" error={errors.segment}><select {...props('segment')} value={segment} onChange={e => setSegment(e.target.value)}><option value="retail">Minorista</option><option value="wholesale">Mayorista</option></select></Field>
      </div></section>
      <section className={styles.panel}><h2>3. Productos y paquetes</h2><p className={styles.intro}>Catálogo visible completo, incluidas promociones y kits. Los precios mostrados aquí son referencias; el resumen se calcula en servidor.</p>
        <label className={styles.label} htmlFor="catalog-search">Buscar en el catálogo</label><input id="catalog-search" className={styles.input} type="search" value={search} onChange={e => setSearch(e.target.value)} data-quote-ignore="true" placeholder="Nombre del producto o paquete" />
        <p className={styles.hint} role="status">{filtered.length} de {catalog.length} productos visibles</p>
        <div className={styles.catalog}>{filtered.map(p => <CatalogProduct product={p} key={p.productId} add={add} atLimit={lines.length >= 50} />)}</div>
        {!filtered.length && <p className={styles.empty}>No se encontraron productos. Prueba otra búsqueda.</p>}
        <div id="items" tabIndex={-1} aria-describedby={errors.items ? 'items-error' : undefined}><h3 style={{ marginTop: 20 }}><strong>Presentaciones seleccionadas ({lines.length}/50)</strong></h3>
          {errors.items && <span id="items-error" className={styles.error}>{errors.items}</span>}
          {!lines.length && <p className={styles.empty}>Añade una presentación para empezar.</p>}
          {lines.map(line => { const product = catalog.find(p => p.productId === line.productId)!; const variant = product.variants.find(v => v.variantId === line.variantId)!; return <article className={styles.line} key={line.key}>
            <div className={styles.lineTop}><strong>{product.productName}</strong><button type="button" className={styles.remove} onClick={() => { setLines(lines.filter(l => l.key !== line.key)); changed(); }} aria-label={`Quitar ${product.productName}, línea ${line.key}`}>Quitar</button></div>
            <div className={styles.fields}><Field id={`variant-${line.key}`} label="Presentación"><select className={styles.input} id={`variant-${line.key}`} value={line.variantId} onChange={e => setLines(lines.map(l => l.key === line.key ? { ...l, variantId: e.target.value } : l))}>{product.variants.map(v => <option key={v.variantId} value={v.variantId} disabled={!v.selectable}>{v.variantLabel}</option>)}</select></Field>
              <Field id={`quantity-${line.key}`} label="Cantidad de paquetes *"><input className={styles.input} id={`quantity-${line.key}`} type="number" min={1} max={99} step={1} required value={line.quantity} onChange={e => setLines(lines.map(l => l.key === line.key ? { ...l, quantity: e.target.value } : l))} /></Field></div>
            <p className={styles.hint}>{variant.commercialUnitsPerPackage === null ? 'Kit comercial: contenido según su descripción. No equivale a una pieza individual.' : `Cada paquete contiene ${variant.commercialUnitsPerPackage} unidad(es) comerciales. La cantidad comprada se indica por separado.`}</p>
            <p className={styles.hint}>{demoMoney(variant.priceCents)} MXN por paquete, antes de descuentos del pedido.</p><span className={`${styles.badge} ${variant.eligibility.eligibility === 'eligible' ? styles.positive : ''}`}>{variant.eligibility.eligibility === 'eligible' ? 'Elegible: individual a precio regular' : 'Excluido de descuento especial'}</span>
          </article>; })}
        </div>
      </section>
      <section className={styles.panel}><h2>4. Dirección de envío</h2><p className={styles.intro}>Dirección ficticia completa. Sólo envío por paquetería; sin recogida ni entrega local.</p><div className={styles.fields}>
        <div className={styles.full}>{input('streetAddress', 'Calle y número *', defaults.streetAddress, 'Captura la dirección completa sin dividirla.', 'text', 160)}</div>
        {input('colonia', 'Colonia *', defaults.colonia, undefined, 'text', 100)}{input('city', 'Ciudad *', defaults.city, undefined, 'text', 100)}{input('state', 'Estado *', defaults.state, undefined, 'text', 100)}{input('postalCode', 'Código postal *', defaults.postalCode, 'Cinco dígitos.', 'text', 5)}
        <div><span className={styles.label}>País</span><p>México</p></div>
      </div></section>
      <section className={styles.panel}><h2>5. Método de envío</h2><p className={styles.intro}>Costos y umbral gratuito calculados por las reglas vigentes, sin modificarlas.</p><Field id="shippingMethod" label="Servicio de paquetería *" error={errors.shippingMethod}><select {...props('shippingMethod')} value={shipping} onChange={e => { setShipping(e.target.value); if (e.target.value !== 'standard') setCourtesy(false); }}><option value="standard">Estándar</option><option value="express">Exprés</option></select></Field></section>
      <section className={styles.panel}><h2>6. Descuento especial</h2><p className={styles.intro}>Sólo individuales a precio regular. No se acumula con beneficios normales sobre las mismas líneas. Los paquetes conservan su precio comercial.</p><div className={styles.fields}>
        <Field id="discountMode" label="Modo de descuento *" error={errors.discountMode}><select {...props('discountMode')} value={discount} onChange={e => setDiscount(e.target.value)}><option value="normal">Reglas normales del pedido</option><option value="special_percentage">Especial por porcentaje</option><option disabled value="fixed">Monto fijo · No habilitado en V1</option></select></Field>
        {discount === 'special_percentage' && <><Field id="discountPercent" label="Porcentaje especial *" error={errors.discountPercent} hint="Administrador: de 0 a 100% de la base elegible."><input {...props('discountPercent', true)} type="number" min={0} max={100} step="0.01" value={values.discountPercent} onChange={e => setValues(v => ({ ...v, discountPercent: e.target.value }))} required /></Field><div className={styles.full}><Field id="discountReason" label="Motivo del descuento *" error={errors.discountReason} hint="De 10 a 500 caracteres."><textarea {...props('discountReason', true)} rows={3} minLength={10} maxLength={500} value={values.discountReason} onChange={e => setValues(v => ({ ...v, discountReason: e.target.value }))} required placeholder="Motivo sintético para esta demostración" /></Field></div></>}
      </div><p className={styles.hint}>Vendedores no habilitados. La identidad y autorización se resuelven en servidor.</p></section>
      <section className={styles.panel}><h2>7. Cortesía de envío estándar</h2><p className={styles.intro}>Excepción administrativa de demostración. No altera la política global ni el envío exprés.</p><label className={styles.check}><input id="courtesy" name="courtesy" type="checkbox" checked={courtesy} disabled={shipping !== 'standard'} onChange={e => setCourtesy(e.target.checked)} aria-invalid={errors.courtesy ? true : undefined} aria-describedby={errors.courtesy ? 'courtesy-error' : undefined} /><span>Aplicar envío estándar gratis por cortesía</span></label>{errors.courtesy && <span id="courtesy-error" className={styles.error}>{errors.courtesy}</span>}
        {courtesy && <Field id="courtesyReason" label="Motivo de la cortesía *" error={errors.courtesyReason} hint="De 10 a 500 caracteres."><textarea {...props('courtesyReason', true)} rows={3} minLength={10} maxLength={500} value={values.courtesyReason} onChange={e => setValues(v => ({ ...v, courtesyReason: e.target.value }))} required /></Field>}
      </section>
    </fieldset>
    <aside className={`${styles.panel} ${styles.summary}`} aria-label="Resumen calculado en servidor">
      <p className={styles.eyebrow}>8. Resumen · MXN</p><h2>Revisa antes de capturar</h2><p className={styles.subtle}>Cotización administrativa no persistida. No genera un pedido ni una atestación.</p>
      <button className={styles.button} type="submit" disabled={pending} style={{ width: '100%', marginTop: 20 }}>{pending ? 'Calculando en servidor…' : 'Calcular resumen demo'}</button>
      <div role="status" aria-live="polite" aria-atomic="true"><p className={styles.hint}>{pending ? 'Espera a que termine el cálculo.' : quote ? 'Resumen calculado en servidor. Revisa los importes y posibles bloqueos.' : result.quote ? 'Los datos cambiaron. Vuelve a calcular el resumen.' : 'Completa los datos y añade productos para obtener los importes.'}</p></div>
      {quote && normal && <><div className={styles.compare}><div>Alternativa normal<strong>{demoMoney(normal.totalCents)}</strong></div><div>{quote.discountMode === 'normal' ? 'Especial no solicitado' : 'Alternativa especial'}<strong>{quote.discountMode === 'normal' ? '—' : demoMoney(quote.totalCents)}</strong></div></div>
        <dl><div><dt>Subtotal</dt><dd>{demoMoney(quote.subtotalCents)}</dd></div><div><dt>Base elegible</dt><dd>{demoMoney(quote.eligibleBaseCents)}</dd></div><div><dt>Descuento normal disponible</dt><dd>{demoMoney(quote.normalDiscountAvailable.amountCents)}</dd></div><div><dt>Descuento aplicado</dt><dd>−{demoMoney(quote.discountCents)}</dd></div><div><dt>Envío calculado</dt><dd>{demoMoney(quote.normalShippingCents)}</dd></div><div><dt>Cortesía aplicada</dt><dd>−{demoMoney(quote.shippingCourtesyApplied?.amountCents ?? 0)}</dd></div><div className={styles.total}><dt>Total MXN</dt><dd>{demoMoney(quote.totalCents)}</dd></div></dl>
        <p className={styles.hint}>{quote.lines.length} presentación(es) cotizada(s). Los kits sin composición estructurada no se convierten automáticamente en piezas.</p>
        <details><summary className={styles.textLink}>Desglose calculado por presentación</summary>{quote.lines.map(line => <div className={styles.line} key={line.key}><strong>{line.productName}</strong><p>{line.variantLabel} · {line.packageQuantity} paquete(s)</p><p className={styles.hint}>{line.totalCommercialUnits === null ? 'Kit: contenido según descripción comercial.' : `${line.commercialUnitsPerPackage} unidad(es) por paquete · ${line.totalCommercialUnits} en total.`}</p><p>Descuento: {demoMoney(line.appliedDiscountCents)} · Neto: {demoMoney(line.netCents)} MXN</p></div>)}</details>
        {blocking.includes('special_discount_less_favorable') && <p role="alert" className={styles.notice}>Bloqueado: el descuento especial ofrece menos ahorro que el normal. Ambas alternativas se conservan para comparación.</p>}
        {blocking.includes('zero_total_persistence_not_authorized') && <p role="alert" className={styles.notice}>Total cero: puede cotizarse, pero no autoriza crear un pedido.</p>}
        {quote.notices.includes('courtesy_already_free') && <p className={styles.hint}>El envío ya era gratuito. No se aplicó un ajuste adicional por cortesía.</p>}
        {!blocking.length && <p className={styles.success}>Resumen calculado. La captura permanece deshabilitada en DEMO.</p>}
      </>}
      <h2 style={{ marginTop: 24 }}>9. Confirmación de revisión</h2><label className={styles.check}><input type="checkbox" checked={reviewed} data-quote-ignore="true" onChange={e => setReviewed(e.target.checked)} disabled={!quote || !!blocking.length || pending} /><span>Revisé los datos ficticios, presentaciones, envío y total de este resumen.</span></label>
      <button type="button" disabled className={`${styles.button} ${styles.disabled}`} style={{ marginTop: 20 }}>Captura disponible después de habilitar el módulo</button>
      <p className={styles.hint}>Aunque confirmes la revisión, esta demostración nunca guarda ni modifica operaciones.</p>
    </aside></div>
  </form>;
}
