import { requireManualDemoAccess } from '@/lib/manual-orders/demo-access';
import { listManualCatalog } from '@/lib/manual-orders/catalog';
import { DEMO_FORM_DEFAULTS } from '@/lib/manual-orders/demo-data';
import { quoteManualDemoAction } from '../actions';
import { ManualOrderDemoForm } from '../_components/ManualOrderDemoForm';
import styles from '../demo.module.css';

export default async function NewManualDemoOrder() {
  await requireManualDemoAccess();
  return <><div className={styles.titleRow}><div><p className={styles.eyebrow}>Captura administrativa · DEMO</p><h1 className={styles.heading}>Nuevo pedido manual</h1><p className={styles.subtle}>Explora el flujo y calcula un resumen. Nada se guarda ni se cobra.</p></div><span className={styles.badge}>Administrador compartido · Sin vendedores</span></div><ManualOrderDemoForm catalog={listManualCatalog()} defaults={DEMO_FORM_DEFAULTS} quoteAction={quoteManualDemoAction} /></>;
}
