# Interfaz privada de demostración — HERB-SYS-001F

Las rutas `/operaciones/pedidos`, `/operaciones/pedidos/nuevo` y `/operaciones/pedidos/[orderId]` son una demostración administrativa, no un módulo de captura habilitado. No hay enlace público. Los ejemplos online y manuales son fixtures identificados como DEMO, no pedidos consultados en una base de datos.

## Acceso y aislamiento

Cada página, el layout y la única Server Action exigen `requireManualDemoAccess`: primero la sesión administrativa existente y después la condición privada `MANUAL_ORDERS_DEMO_ENABLED === 'true'`. Ausente o cualquier otro valor: no se muestra el módulo. `VERCEL_ENV=production` lo bloquea incluso con el flag en true. El login permanece fuera del layout y no se modifica. Las rutas usan render dinámico y metadata noindex/nofollow; no se cachean fixtures en páginas públicas.

No utiliza `MANUAL_ORDERS_ENABLED`, HMAC, service.ts, repository.ts, RPC, tablas 012 ni clientes de proveedores. No aplica migraciones ni requiere 011/012. No se cambia ninguna variable de Vercel. Publicar el PR por sí solo no habilita la demo. Un futuro Preview interactivo requeriría autorización separada de configuración y credenciales exclusivamente sintéticas; el Preview normal conserva la demo cerrada.

## Flujo y límites

- Listado unificado ficticio con origen técnico, canal, clasificación, importes y estados. Búsqueda/filtros GET en memoria. Sin paginación ni contadores de Supabase ficticios.
- Catálogo server-only existente: todos los productos activos y variantes visibles; incluye kits y promociones, marca existencias y elegibilidad explícita. Presentaciones históricas ocultas siguen ocultas. Cantidad comprada es cantidad de paquetes; la composición se muestra separadamente y no se inventan piezas para kits no estructurados.
- Datos de cliente/dirección y clasificación combinable. Para evitar contactos reales accidentales la demo exige nombre con DEMO, teléfono sintético 5500000000–5500009999 y correo opcional `.invalid`. Sólo envío por paquetería a México. No se guardan perfiles ni direcciones.
- Server Action sólo de cálculo, protegida incluso ante llamada directa. Valida campos permitidos, duplicados, dirección completa, razones, canal y segmento. Construye el contexto de administrador compartido en servidor; no acepta rol, precio ni total del navegador. Reutiliza sin cambios el motor de PR #35 y muestra normal frente a especial. No persiste cotizaciones, firmas ni snapshots.
- Porcentaje 0–100% sólo sobre la base elegible; kits/promociones excluidos. Monto fijo y vendedores deshabilitados. Cortesía sólo para estándar con motivo. Se conservan las reglas normales y el bloqueo de especial menos favorable; total cero se muestra pero no autoriza captura.
- Los cambios invalidan el resumen y desmarcan la revisión. La casilla comienza desmarcada. El botón de captura siempre está disabled, incluso con resumen válido y aceptación. No hay guardado local, pagos, cancelaciones, modificaciones logísticas ni comunicaciones.
- Detalle sólo de IDs de fixtures; un UUID u otro ID desconocido responde 404 después de autorización. El historial es ilustrativo y no se presenta como auditoría persistida.

## Verificación

`npm test` incluye `tests/manual-orders/demoUi.test.mjs`: guardas, autorización previa a lectura/cálculo, catálogo completo, reglas reales/sintéticas, validación, blockers, SSR de controles, asociaciones accesibles y ausencia de persistencia. Los módulos se cargan con dependencias explícitas sin SDK ni archivos de entorno. Esa inyección no es aislamiento de red del sistema operativo.

Ejecutar también `npm run typecheck`, `npm run build` y `git diff --check`. La validación visual debe cubrir 1440, 768, 390 y 320 px; el resumen permanece en flujo y pasa al final en tablet/móvil. Las comprobaciones de UI y las de autenticación real deben distinguirse de SSR con dependencias simuladas. No usar Production, staging, claves ni pedidos reales para validar.

`npm run test:demo:local`, después del build, inicia sus propios procesos `next start` en puertos efímeros de 127.0.0.1. No acepta destinos externos ni argumentos. Rechaza archivos `.env*` (excepto el ejemplo) sin abrirlos y no hereda variables de proveedores. Utiliza una contraseña sintética pública sólo en esos procesos. Verifica login real y cookie sin seguir la redirección a despacho, rutas privadas, filtros, detalle, IDs desconocidos, POST real a la acción de cotización con/sin sesión, errores de dirección y bloqueo de GET/POST tanto sin flag como en Vercel Production. Comprueba que Home no expone fixtures; detiene únicamente sus procesos al terminar. No ejecuta JavaScript de navegador ni reemplaza la revisión visual.

La futura conexión a persistencia, pagos, navegación operativa y roles individuales exige otro PR y autorización independiente. Esta interfaz no certifica esos flujos.
