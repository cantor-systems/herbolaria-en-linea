# Persistencia durable de pedidos

Los pedidos de Checkout Pro se almacenan en Supabase PostgreSQL antes de crear la preferencia de Mercado Pago. PostgreSQL es la única fuente durable del estado del pedido; no existe un respaldo en memoria para fulfillment ni para analytics.

## Configuración

Configura estas variables únicamente en el entorno server-side:

```dotenv
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` permite omitir RLS y debe tratarse como un secreto. Nunca debe llevar el prefijo `NEXT_PUBLIC_`, enviarse al navegador, escribirse en logs ni incluirse con un valor real en el repositorio.

El cliente de `src/lib/supabase/admin.ts` se inicializa de forma diferida. Por eso `npm run build` no necesita que las variables existan, pero las rutas de pagos responderán con un error genérico `503` hasta configurarlas.

## Aplicar la migración

La migración está en `supabase/migrations/001_orders.sql`. Debe aplicarse al proyecto correcto antes de desplegar el código, usando Supabase CLI o el editor SQL del panel de Supabase. Con la CLI vinculada al proyecto:

```bash
supabase db push
```

Revisa primero el proyecto y entorno seleccionados. La migración crea tablas, restricciones, índices, funciones transaccionales y permisos; no contiene secretos.

## Tablas

### `orders`

Guarda la referencia única generada por el servidor, IDs de Mercado Pago, estado interno, moneda, subtotal, envío, total, datos mínimos de contacto y entrega, timestamps y un código técnico de fallo de preferencia. `checkout_attempt_id` hace idempotentes los reintentos del mismo intento de checkout.

### `order_items`

Guarda el snapshot server-side de producto, variante, cantidad, precio unitario y total de línea. Los precios provienen exclusivamente del catálogo y del cálculo del servidor.

### `payment_events`

Registra eventos mínimos de auditoría: pedido, proveedor, ID de pago, origen técnico, estado del proveedor y una clave de deduplicación. No almacena el payload completo de Mercado Pago ni datos de tarjeta.

Las tres tablas tienen RLS habilitado, no tienen políticas públicas y revocan acceso a los roles `anon` y `authenticated`. Las funciones de escritura sólo se conceden a `service_role`.

## Flujo de creación

1. La ruta valida el payload, comprador y carrito.
2. El servidor vuelve a obtener productos, variantes, precios y envío.
3. Genera `external_reference` y crea en una transacción el pedido `pending_payment` y sus partidas.
4. Crea la preferencia con la misma referencia como idempotency key de Mercado Pago.
5. Adjunta `mercadopago_preference_id` al pedido.
6. Si el proveedor falla, el pedido permanece sin aprobar y recibe únicamente el código técnico `preference_creation_failed`.

El checkout manda un UUID opaco en `Idempotency-Key`. Ese UUID no decide precios, referencia, estado ni aprobación; sólo permite recuperar el mismo pedido cuando una respuesta se pierde y el usuario reintenta sin cambiar los datos ni recargar la página. Si cambia el carrito o comprador, el checkout crea otro UUID. La función PostgreSQL también rechaza reutilizar una clave con datos diferentes.

En un reintento con el mismo `checkout_attempt_id`, `create_pending_order` no inserta otro pedido: bloquea y devuelve la fila existente. La nueva referencia solicitada no tiene que coincidir porque la ruta continúa con el `external_reference` durable devuelto por PostgreSQL. Carrito, comprador, dirección y totales sí deben coincidir; cualquier diferencia produce `checkout_idempotency_conflict`.

## Estados

Estados internos permitidos:

- `pending_payment`: pedido creado, todavía sin estado verificable del pago.
- `pending`: Mercado Pago reportó `pending`, `in_process` o `authorized`.
- `approved`: Mercado Pago reportó `approved` y el pago superó todas las validaciones server-side.
- `rejected`: Mercado Pago reportó `rejected`.
- `cancelled`: Mercado Pago reportó `cancelled`.
- `refunded`: Mercado Pago reportó `refunded`.
- `charged_back`: Mercado Pago reportó `charged_back`.

Los estados desconocidos se auditan como estado del proveedor sin inventar una transición interna. Un evento atrasado de `pending` o `rejected` no degrada un pedido aprobado. `refunded` y `charged_back` son terminales frente a eventos anteriores atrasados.

## Verificación e idempotencia

Tanto `payment-status` como el webhook consultan el recurso Payment directamente a Mercado Pago. Antes de escribir validan ID, `external_reference`, moneda MXN, estado del proveedor, metadata, total de productos más `shipping_amount`, tipos e enteros seguros.

La función transaccional `record_verified_payment` bloquea el pedido, exige que el total verificado coincida con el total durable y actualiza pedido + evento en una operación atómica. `payment_events` conserva todos los payment IDs verificados, por lo que un intento rechazado o pendiente no bloquea la aprobación de un intento posterior. `orders.mercadopago_payment_id` se asigna únicamente al payment ID aprobado/final: el mismo ID puede pasar idempotentemente de `pending` a `approved`, pero un segundo ID aprobado no sustituye al primero y se eleva como conflicto de integridad después de dejar su evento durable para revisión.

Los eventos `pending`, `rejected`, `cancelled`, `refunded` y `charged_back` nunca asignan por sí solos el payment ID final. Un reembolso o contracargo sólo reemplaza el estado `approved` cuando corresponde al payment ID final; un evento de otro intento no degrada el pago aprobado del pedido. La clave de deduplicación combina el proveedor, el ID de pago y un SHA-256 del estado del proveedor para evitar duplicar eventos aunque el mismo estado llegue por retorno y webhook.

## Pruebas antes de producción

1. Aplicar la migración en un proyecto de prueba y configurar las dos variables privadas.
2. Crear una compra con envío y comprobar pedido, partidas, subtotal, envío y total.
3. Repetir la misma solicitud con igual `Idempotency-Key` y confirmar que no crea otro pedido ni preferencia.
4. Repetirla con la misma clave pero datos distintos y confirmar que se rechaza.
5. Aprobar un pago sandbox y comprobar `mercadopago_payment_id`, `approved`, `provider_status` y `paid_at`.
6. Reenviar el mismo webhook y confirmar que existe un solo evento para el mismo pago y estado.
7. Registrar un payment ID rechazado y después otro aprobado para la misma referencia; ambos deben existir en `payment_events` y sólo el aprobado debe quedar en `orders.mercadopago_payment_id`.
8. Probar la transición del mismo payment ID de pendiente a aprobado.
9. Intentar dos payment IDs aprobados distintos y confirmar que el segundo evento queda auditado sin sustituir silenciosamente el pago final.
10. Probar estados pendiente, rechazado, cancelado y reembolsado.
11. Confirmar que una firma inválida no modifica ninguna tabla.
12. Confirmar que los roles `anon` y `authenticated` no pueden leer ni escribir las tablas o ejecutar las RPC.
13. Verificar backups, rotación de la service role key y monitoreo de errores antes de habilitar pagos reales.

## Limitaciones pendientes

- No hay panel administrativo, autenticación de clientes, fulfillment ni emails.
- No hay política automatizada de retención o eliminación de datos personales; debe definirse antes de producción según obligaciones operativas y legales.
- Un reload completo del checkout genera un nuevo UUID de intento; podría dejar pedidos `pending_payment` abandonados. Hace falta una política de expiración/limpieza, pero nunca deben considerarse aprobados.
- La migración y las rutas necesitan una prueba de integración contra un proyecto Supabase real; el build sólo valida compilación y tipos.
- Purchase analytics continúa fuera de este flujo y no debe activarse hasta validar la idempotencia durable en el entorno desplegado.
