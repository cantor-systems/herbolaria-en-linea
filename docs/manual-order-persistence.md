# Persistencia aislada de pedidos manuales — HERB-SYS-001E

PR de persistencia, no de interfaz ni activación. No crea rutas o Server Actions. No incluye cotizaciones comerciales persistidas, vendedores individuales, recogida, reembolsos ni cambios de checkout. La cotización administrativa previa de HERB-SYS-001D sigue siendo un cálculo, no una autorización de escritura.

## Flujo protegido

El futuro caller administrativo utiliza únicamente `service.ts`: feature flag exacta, sesión administrativa existente, validación estricta, recuperación idempotente y recálculo servidor antes de persistir. No aceptar del navegador roles, estados, precios, descuentos calculados, elegibilidad ni total. El cliente sólo solicita los parámetros comerciales autorizados y confirma el fingerprint del resumen.

Los clientes existentes usan clasificación/versionado leídos de `customer_profiles`; la clasificación enviada para un perfil existente debe ser null. Para un perfil nuevo, el administrador compartido puede capturar una clasificación validada. No hay permiso de reclasificación ni cuentas de vendedor. Los perfiles permanecen inmutables en esta versión.

`createManualOrder` devuelve primero un comando durable coincidente si una respuesta se perdió; no recalcula ni duplica un pedido ya creado si cambiaron precios o perfil después. Un mismo comando con otra intención genera conflicto. El resultado repetido corresponde a la operación original: una futura UI debe consultar el detalle actual, no confundirlo con el saldo vigente tras operaciones posteriores.

Para una creación nueva exige aceptación, motivo, fingerprint actual, total positivo y ausencia de motivos bloqueantes (incluido `special_discount_less_favorable`). El motor puede cotizar cero, pero esta capa y SQL lo rechazan. El pedido se inserta siempre como pending_payment, sin IDs/eventos Mercado Pago ni pago ficticio.

## Atestación e integridad de RPC

RLS no basta porque service_role puede omitirla y actualmente tiene permisos amplios sobre pedidos. Se agrega una segunda frontera: las RPC manuales necesitan HMAC-SHA256 del payload exacto UTF-8 emitido por servidor, con actor compartido, operación, comando, hash de intención y vigencia máxima de cinco minutos. La comparación de los 32 bytes no termina anticipadamente. El payload está limitado a 512 KiB. No imprimir payloads, firmas o claves.

Variables futuras, exclusivamente privadas, sin valores reales en el repositorio:

- `MANUAL_ORDERS_ENABLED`: sólo el valor exacto `true` habilita los entry points. Cualquier otro valor impide escrituras antes de consultar pedidos o clientes.
- `MANUAL_ORDERS_RPC_SIGNING_KEY`: 32 bytes representados como 64 caracteres hexadecimales. Sin valor predeterminado. Nunca debe ser la service-role key, contraseña administrativa u otra credencial existente.

Además, la nueva tabla `manual_private.configuration` se crea con enabled=false y clave null. Sólo un responsable SQL autorizado podrá provisionar posteriormente la clave correspondiente y habilitar esa configuración. No existe RPC para cambiarla y service_role no puede leerla ni escribirla. El rol ejecutor sólo puede leerla. La futura clave debe generarse y custodiarse de forma segura; los valores sintéticos de las pruebas nunca deben provisionarse en un entorno real. Este PR no realiza esa provisión ni modifica Vercel.

Cambiar variables en Vercel requiere un nuevo deployment. El flag no revoca credenciales de base de datos ni sustituye autenticación, HMAC o invariantes. Para una suspensión completa futura, coordinar ambos controles y las versiones desplegadas. La recuperación de un comando completado sigue requiriendo la autenticación y el flag del servicio. Nunca invocar manualmente las RPC para saltarse activación.

La clave firma una validación comercial realizada en Node: PostgreSQL no posee una réplica del catálogo y no puede verificar por sí mismo su precio vigente. SQL verifica la firma, consistencia de snapshot, sumas, totales y estados. Comprometer el servidor autenticado o la clave de firma compromete esa atestación; no se presenta como protección frente al dueño de la base o a ejecución arbitraria de código servidor. La futura custodia, provisión y rotación requieren autorización independiente. Durante una restauración nunca habilitar escrituras locales con claves productivas.

## Esquema y permisos

`012_manual_orders.sql` es la única migración nueva. 011 permanece reservada al PR #21 y no se copia ni aplica por este PR. La migración agrega origen/canal, estado/versionado, snapshots, perfiles, ledger externo, comandos, ajustes e historial. No transforma históricos ni actualiza precios, pagos o estados online. Conserva el folio público existente. Los nuevos campos online tienen defaults compatibles y checkout_attempt_id continúa siendo obligatorio para online mediante constraint.

Las seis RPC públicas son `manual_create_order`, `manual_record_payment`, `manual_void_payment`, `manual_cancel_order`, `manual_set_order_hold` y `manual_mark_order_shipped`, todas `(p_payload text, p_signature text) -> jsonb`. SECURITY DEFINER pertenece a `herb_manual_executor`, NOLOGIN, sin superusuario, creación de roles/bases, replicación o BYPASSRLS. No hay membresía para service_role. search_path fijo y sin SQL dinámico. PUBLIC, anon y authenticated no pueden ejecutarlas. Los helpers y configuración permanecen privados.

Las tablas nuevas no conceden DML a service_role; sólo lectura administrativa. El ejecutor tiene los permisos mínimos de sus operaciones y políticas RLS explícitas. Guardas independientes bloquean inserción/edición manual directa, reasignación de origen, alteración de partidas/snapshots, pagos Mercado Pago y cambios financieros fuera de las operaciones firmadas. Se revoca TRUNCATE de service_role sobre las cuatro tablas previas relacionadas, porque los triggers de fila no cubren TRUNCATE. No cambia ninguna operación soportada del checkout.

Ledger, comandos, ajustes, actividad y perfiles rechazan UPDATE/DELETE. Esta inmutabilidad es del contrato de aplicación/roles: el propietario de la base conserva facultades de mantenimiento y DDL. No es un registro externo a prueba de administradores privilegiados.

## Cobros y operación

Métodos: bank_transfer, deposit y cash. Referencia/folio obligatorio para los tres, normalizado con trim y mayúsculas, único globalmente para los cobros manuales, incluso si se anula una captura. Esta política conservadora puede requerir referencias con un espacio de nombres acordado por el negocio; no se deben introducir números de cuenta o comprobantes completos. No cambiar esa política silenciosamente para resolver una coincidencia.

Los cobros usan centavos enteros positivos, fecha de operación, fecha de registro SQL, motivo y actor shared_admin. La fecha no puede adelantarse más de cinco minutos al reloj SQL. No se afirma verificación bancaria automática. Hay pagos parciales; saldo completo exacto proyecta approved y paid_at como momento de confirmación administrativa de cobertura. Se rechazan sobrepagos, referencias repetidas y versiones antiguas.

Todas las operaciones bloquean el pedido y los comandos se serializan por clave. Dos comandos nuevos sobre una misma versión no pueden modificarla simultáneamente. Un replay no cambia fechas ni versión. La versión aumenta con cada operación aceptada.

Suspensión exige motivo y confirmación y bloquea cobros/despacho. Cancelación exige ledger neto cero y ausencia de despacho. Un cobro realmente recibido no se anula como si fuese un error para permitir cancelar: V1 no implementa reembolsos. `voidManualPayment` sólo admite una captura errónea completa, confirmada explícitamente, una vez y antes del envío; registra contrapartida, no borra el cobro ni devuelve dinero. Si se pierde cobertura, revierte la proyección a pending_payment y conserva el paid_at anterior en el evento histórico. Partidas e importes se corrigen cancelando y creando otra operación, no editándolos.

El despacho firmado exige activo, approved y cobertura completa. Reutiliza mark_order_shipped; el mismo comando es idempotente. Después del envío no se permiten operaciones financieras/cancelaciones de V1. No hay operación manual de confirmación de entrega en este módulo.

## Notificaciones y coexistencia con 011

Las funciones de encolado y reclamación se reemplazan con definiciones completas compatibles que conservan el comportamiento online y excluyen manuales. Otro trigger impide insertar/actualizar notificaciones manuales incluso directamente. No hay filas reclamables para el procesador existente, por lo que retorna skipped antes de cargar datos o inicializar Resend. No se debilita el normalizador que exige pago Mercado Pago para online. WhatsApp queda sin consentimiento en estos pedidos; no se generan mensajes ni se registran avisos manuales.

012 no depende de columnas delivered: sus guardas independientes usan JSON de fila para preservar compatibilidad. Las pruebas verifican 001–010→012→011 y 001–010→011→012, manteniendo el trigger de prohibición de retrocesos. 011 reemplaza funciones logísticas, pero no elimina estas guardas ni el permiso del ejecutor a mark_order_shipped.

Las acciones administrativas actuales NO están conectadas a los nuevos servicios. Una escritura mediante una RPC logística antigua sobre un pedido manual falla cerrada; no permite saltarse la firma. Un replay original que sólo devuelve una fila sin UPDATE no crea una operación nueva. La adaptación de listado/formularios y eventual entrega manual corresponde a una fase posterior. No se activa DELIVERY_CONFIRMATION_ENABLED. Para online se comprueba pago verificado, encolado, despacho y entrega de 011 en la base sintética.

## Validación local y límites

- `npm test`: módulos reales con dependencias inyectadas y proveedores simulados; sin archivos de entorno.
- `npm run test:db:manual`: crea su propio PostgreSQL nuevo usando exclusivamente la imagen ya instalada y fijada por SHA-256. No acepta URL, contenedor ni argumentos externos. Sólo Docker Desktop local por named pipe, pull=never, network=none, ningún puerto/bind mount, raíz readonly y datos/socket en tmpfs. Verifica identidad/aislamiento antes del primer SQL. Elimina únicamente su contenedor etiquetado con UUID y espera su retirada. No utiliza staging ni los contenedores existentes.
- El runner requiere el blob local de 011 del commit fijado `953996dedd86804e27b6b37afd4388091a3e1035`; si falta, se detiene antes de crear recursos. No lo descarga ni ejecuta fuera de sus bases desechables.
- Verifica ACL reales (incluido cambio de identidad de sesión para intentar escalar), firma manipulada/expirada, creación/rollback, replay/concurrencia, ledger, estados, referencias, despacho, notificaciones, históricos y ambos órdenes con 011. Prueba pgcrypto tanto en public como en extensions.
- No constituye validación de PostgREST, cookies en navegador ni proveedores reales. Ningún endpoint nuevo existe todavía. La verificación bancaria es administrativa y compartida.

Antes de cualquier aplicación futura: auditar identidad, esquema/ACL/extensiones reales y versiones desplegadas con autorización de lectura; no asumir que Production coincide con estas migraciones. Resolver el orden de 011, respaldo recuperable y provisión/custodia. Revisar un plan de migraciones que contenga únicamente la operación autorizada; no usar db push indiscriminado. 012 usa transacción y lock_timeout de cinco segundos: limita espera de bloqueo, no la duración de ACCESS EXCLUSIVE ni el escaneo de constraints. Reservar ventana, monitorear y abortar ante discrepancias; no inventar tiempos.

Ante error antes de COMMIT, rollback y revisar el destino/historial. Ante desconexión con resultado incierto, comprobar esquema e historial antes de repetir. Después de existir manuales no volver a código/esquema que ignore sus controles; preferir desactivar escrituras conservando versión compatible. No borrar ni transformar operaciones como rollback. No hay ejecución automática de migraciones en el workflow de CI existente.
