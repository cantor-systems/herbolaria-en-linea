# H7.2: validación aislada de preferencias de Mercado Pago

Este documento separa lo comprobado localmente de lo que requiere un stack Supabase aislado o credenciales de Mercado Pago sandbox. Ningún paso debe apuntar a Producción.

## Contrato comprobado del SDK 3.4.0

La versión fijada en `package-lock.json` es `mercadopago@3.4.0`.

| Operación | Endpoint del SDK | Resultado de runtime |
| --- | --- | --- |
| `Preference.create` | `POST /checkout/preferences/` | Devuelve el JSON del API y agrega `api_response`. No normaliza metadata, artículos, envío ni fechas. |
| `Preference.get` | `GET /checkout/preferences/{id}` | Devuelve el JSON del API y agrega `api_response`. |
| `Preference.search` | `GET /checkout/preferences/search` | Devuelve `{ elements?, next_offset?, total? }`; cada elemento es un resumen y debe completarse con `get`. |

Los tipos `PreferenceResponse` declaran como opcionales `metadata`, `items`, `shipments`, fechas, referencia y URLs. El ejemplo oficial del API también muestra normalizaciones que no coinciden con el tipo estático: `unit_price` puede llegar como cadena decimal, los artículos pueden omitir `id`, y el envío puede omitir `cost` en la respuesta. La búsqueda sólo cubre los últimos 90 días.

H7 aplica estas reglas:

- La respuesta inmediata de `create` o un `get` de una preferencia ya asociada valida ID, referencia cuando está presente y URL de checkout. No usa campos opcionales devueltos por el proveedor como prueba de creación.
- Una recuperación por resultado incierto permanece estricta: `search` debe producir exactamente un candidato concluyente y `get` debe comprobar el snapshot durable antes de asociarlo.
- Los precios aceptan número o cadena decimal exacta de hasta dos decimales.
- Si el proveedor omite IDs de artículo, la comparación usa título, cantidad, moneda y precio; si devuelve IDs, también deben coincidir.
- La omisión de metadata, costo de envío o fechas durante una recuperación no se interpreta como coincidencia. El pedido permanece cerrado para evitar asociar una preferencia no comprobable.
- `total = 0` no prueba inexistencia y nunca habilita por sí solo una segunda creación.

## Riesgos de normalización pendientes de sandbox

Se debe capturar una respuesta sanitizada de `create`, el `get` inmediato y `search` para una preferencia sandbox y comprobar:

1. Si `metadata.order_id` y `metadata.expected_total_cents` vuelven sin cambios.
2. Si `items[].id` se conserva y si `unit_price` llega como número o cadena.
3. Si `shipments.cost` está presente en `create` y `get`, especialmente con envío gratuito y con costo.
4. Si las fechas vuelven con otra zona horaria o precisión. La implementación compara el instante, no el texto ISO.
5. Si `date_of_expiration` aparece junto con la ventana `expiration_date_from/to`.
6. Si `search.total`, `elements.length` y `next_offset` son consistentes inmediatamente después de crear y tras unos segundos.
7. Cuánto tarda una preferencia recién creada en ser visible mediante `search` por `external_reference`.

Hasta completar estos casos, una recuperación puede producir un falso conflicto seguro: se niega el enlace, pero no se crea ni asocia otra preferencia.

## Pedidos detenidos en creación

`preference_creation_in_progress` es un claim durable. No debe borrarse ni convertirse en `preference_provider_failed` sólo porque una búsqueda devuelva cero resultados.

Procedimiento administrativo de sólo lectura:

1. Consultar pedido, `external_reference`, total, moneda, partidas, timestamps, `preference_error_code` y eventos de pago.
2. Buscar preferencias por la referencia exacta. No buscar por datos personales.
3. Si hay un único candidato, obtenerlo por ID y ejecutar la misma validación del snapshot.
4. Si hay múltiples candidatos, un candidato diferente o información incompleta, no asociar ninguno y escalar para revisión.
5. Buscar pagos por `external_reference`, incluidos estados pendientes y operaciones offline, antes de permitir cualquier intento nuevo.
6. Si no hay preferencia comprobable, esperar como mínimo hasta que termine la ventana de 30 minutos derivada de `orders.created_at`; después repetir las consultas y dejar que el comprador confirme explícitamente una compra nueva.
7. No editar el pedido antiguo, no reutilizar su enlace, no reclasificarlo y no cancelar ni reembolsar automáticamente pagos tardíos.

Una investigación administrativa nunca debe ejecutar `create`, limpiar el claim para forzar otro intento ni interpretar ausencia temporal en el índice de búsqueda como inexistencia definitiva.

## PostgreSQL y PostgREST locales

### Requisitos

- Node.js compatible con el proyecto.
- Dependencias instaladas mediante `npm ci`.
- Supabase CLI fijado por `package-lock.json`.
- Docker Desktop o un runtime compatible activo. En Windows, el runtime nativo de Supabase no está soportado.
- Puertos locales de Supabase disponibles.
- Ningún vínculo de la CLI con un proyecto remoto durante estas pruebas.

Inicialización, sólo en un entorno desechable:

```powershell
npx supabase init
npx supabase start
npx supabase db reset
```

`db reset` elimina el contenido de la base local. Antes de ejecutarlo, confirmar que `supabase status` muestra exclusivamente URLs de loopback.

### Prueba SQL real

```powershell
npm run test:db:h7
```

`supabase/tests/database/h7_preference_expiration_test.sql` se ejecuta dentro de una transacción pgTAP revertida y verifica:

- coexistencia de la RPC anterior, v2 y claim;
- RLS de `orders`;
- permisos de `anon`, `authenticated` y `service_role`;
- compatibilidad de la firma anterior;
- escritura e idempotencia de la RPC v2;
- conservación de fechas nulas históricas;
- claim único y reintento sólo después de un fallo definitivo.

### Prueba real de PostgREST

Obtener localmente las credenciales generadas por `supabase status -o env` y asignarlas sin imprimirlas ni guardarlas en archivos versionados:

```powershell
$env:H7_LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321'
$env:H7_LOCAL_ANON_KEY = '<anon local>'
$env:H7_LOCAL_SERVICE_ROLE_KEY = '<service role local>'
npm run test:postgrest:h7
```

El runner rechaza cualquier host que no sea loopback. Crea filas sintéticas sin datos personales, prueba ambas RPC por HTTP, confirma denegación para `anon`, ejecuta dos claims concurrentes y elimina sus filas al terminar. Una llamada exitosa a la RPC v2 demuestra que el caché de esquema de PostgREST fue recargado.

## Mercado Pago sandbox

Requisitos antes de autorizar la ejecución:

- aplicación y usuario vendedor de prueba independientes de Producción;
- comprador de prueba distinto del vendedor;
- credenciales sandbox en un gestor de secretos, nunca en archivos o logs;
- Supabase de prueba independiente o stack local accesible mediante un túnel HTTPS controlado;
- URL HTTPS de Preview dedicada para `back_urls` y webhook;
- identificador de ejecución y `external_reference` claramente marcados como sandbox;
- procedimiento de borrado de datos de prueba y revisión de logs sanitizados.

Matriz mínima:

1. Crear una preferencia con envío y otra con envío gratuito; comparar `create`, `get` y `search` sanitizados.
2. Simular pérdida de respuesta después de `create`; recuperar sin una segunda creación.
3. Repetir la búsqueda inmediatamente y con demoras controladas para medir consistencia.
4. Confirmar el comportamiento de `401 invalid_caller_id` con una credencial de prueba deliberadamente inválida, sin usar tokens productivos.
5. Abrir el checkout antes y después del límite de 30 minutos.
6. Generar una instrucción offline antes del límite y confirmar que un webhook tardío sigue validándose contra el snapshot histórico.
7. Repetir dos solicitudes concurrentes del mismo pedido y comprobar un solo ID de preferencia.

No se debe ejecutar este bloque hasta contar con autorización explícita para usar el entorno sandbox.

## Orden de despliegue y reversión

1. Aplicar la migración aditiva 010.
2. Verificar por PostgreSQL y PostgREST que la RPC anterior y v2 coexisten.
3. Confirmar permisos y recarga de caché.
4. Desplegar el backend que llama exclusivamente a v2.
5. Para revertir, volver primero al backend anterior a H7 y conservar la migración. No eliminar columnas ni RPC durante la reversión operativa.

## Referencias públicas

- [Mercado Pago: crear preferencia](https://www.mercadopago.com.mx/developers/es/reference/online-payments/checkout-pro-preferences/create-preference/post)
- [Mercado Pago: obtener preferencia](https://www.mercadopago.com.mx/developers/es/reference/online-payments/checkout-pro-preferences/get-preference/get)
- [Mercado Pago: buscar preferencias](https://www.mercadopago.com.mx/developers/es/reference/online-payments/checkout-pro-preferences/search-preferences/get)
- [Supabase: pruebas de base de datos con pgTAP](https://supabase.com/docs/guides/database/testing)
- [Supabase: desarrollo local](https://supabase.com/docs/guides/local-development)
