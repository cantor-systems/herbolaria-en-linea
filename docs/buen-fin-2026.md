# BF20 — Buen Fin 2026

BF20 aplica 20% al precio comercial de productos y variantes visibles, incluidos paquetes promocionales. Mínimo elegible: 79900 centavos, antes del cupón y sin envío. Las variantes históricas ocultas conservan su cotización normal, pero no aportan al mínimo ni reciben BF20 en carritos mixtos. El catálogo servidor determina su elegibilidad; los campos de precio/elegibilidad enviados por el navegador se rechazan.

Vigente del 12 de noviembre de 2026 a las 00:00 al último milisegundo del 17, en America/Mexico_City. La validación se repite en servidor. Se conserva el redondeo comercial en centavos y la normalización trim/uppercase. MORONEL15 conserva su configuración histórica; los mensajes son genéricos.

Mayoreo reemplaza al cupón, sin acumulación ni selección automática del mayor beneficio. Sólo se admite un código. Los precios rebajados de paquetes sí reciben BF20. El cotizador administrativo rechaza explícitamente BF20 antes de reutilizar el motor de checkout; no se habilitan escrituras manuales.

El envío conserva el subtotal previo a descuentos: 79900 - 15980 + 0 = 63920 centavos estándar; con exprés, 79900 - 15980 + 7900 = 71820. No hay cambios de tarifas.

Las preferencias emitidas válidamente conservan su snapshot y vencimiento original. La confirmación de pagos no consulta la vigencia actual de promociones ni recalcula históricos. Una nueva solicitud después del corte se rechaza; no se promete recuperar una solicitud de checkout vencida por la ruta de repricing. No se cambian SQL, RPC, tiempos offline, MSI ni configuración de proveedores.

La prueba de pago exprés detectó un defecto previo en la conversión de importes de proveedor: 639.20 * 100 tiene ruido binario y se rechazaba con tolerancia EPSILON absoluta. La comprobación ahora compara el importe original con centavos/100, conservando el rechazo de fracciones reales de centavo y enteros inseguros. No cambia la igualdad exigida frente al snapshot.

La slide `buen-fin-2026` usa únicamente los WebP aprobados, copiados sin transformar, y enlaza `/tienda`. Su ventana es [2026-11-12T00:00:00-06:00, 2026-11-18T00:00:00-06:00). Las otras tres slides sólo cambian de orden. Home conserva revalidate=60. El copy está en HTML y el CSS específico conserva el área verde y los productos.

Validación local: pruebas con reloj fijo cubren límites temporales, mínimo, redondeo, todas las variantes visibles, mixtos con históricos, mayoreo, payloads manipulados, snapshots y preferencias simuladas, replay y verificación de pago posterior. Los proveedores y la persistencia son dependencias simuladas: esto no verifica transacciones reales, SQL remoto, PostgREST ni MSI. La suite existente mantiene las pruebas de concurrencia del ciclo de preferencias. No ejecutar SQL ni suites remotas para este cambio.

## Revisión local del 13 de noviembre de 2026

- Base: 6d50adfd4f0bcc2709584e12288deebc53608f95, rama codex/herb-web-013-buen-fin-2026.
- npm test: 164/164 aprobadas. Sin dependencias nuevas ni cambios de lockfile. No existe script lint.
- npm run build: aprobado con Turbopack, 33 páginas generadas y Home con revalidate de un minuto. La junction inicial de dependencias fue rechazada por Turbopack; se sustituyó por una copia local de los paquetes ya instalados y el build final pasó. Se retiró la junction temporal. typecheck y diff check aprobados. El cambio generado en next-env.d.ts se devolvió a su contenido base.
- Chromium local: imágenes cargadas, copy y CTA /tienda comprobados, navegación ArrowRight/Home correcta, cero errores de página. Anchos de slide/scrollWidth: 1376/1376, 720/720, 358/358 y 288/288. El encabezado conserva su desbordamiento previo a 320 px.
- Capturas revisadas: C:/Users/MAXIM/AppData/Local/Temp/herb-bf20-review-6Yh5lF/bf20-{1440,768,390,320}.png. El runner tests/integration/localBf20Browser.mjs rechaza archivos de entorno, inicia su propio servidor loopback y bloquea solicitudes externas y métodos distintos de GET. Requiere un paquete Playwright local ya instalado, seleccionable mediante HERB_BF20_PLAYWRIGHT_MODULE; no instala navegadores ni utiliza credenciales.
- WebP desktop: 1983×793, 96348 bytes, SHA256 5131B8B284AE497BDDE8686246B21F48048E8F2E79238C96F9D21277F7CD8D70.
- WebP móvil: 948×1659, 73300 bytes, SHA256 8563733B5C4D00E62FDC9D9655F7F620BCFF05EA9DF2C59744A5D8D69904B71D.
- Ambos hashes coinciden con los originales aprobados. Las tres slides previas sólo cambian de posición; su contenido permanece igual.
- No se ha realizado commit, push, PR, despliegue ni ninguna operación de proveedores remotos.

## Archivos del cambio

Modificados:

- src/config/promotions.ts
- src/lib/promotions.ts
- src/lib/checkout/serverPricing.ts
- src/context/CartContext.tsx
- src/app/api/mercadopago/create-preference/route.ts
- src/lib/mercadopago/paymentVerification.ts
- src/lib/manual-orders/pricing.ts
- src/app/carrito/page.tsx
- src/components/store/DrawerCart.tsx
- src/content/promotional-slides.ts
- src/components/marketing/PromotionalSlider.tsx
- src/components/marketing/PromotionalSlider.module.css
- tests/checkout/shippingPricing.test.mjs
- tests/checkout/shippingPreference.test.mjs
- tests/helpers/isolatedModule.mjs
- tests/manual-orders/pricing.test.mjs
- tests/marketing/promotionalSlider.test.mts

Creados:

- public/images/banners/bf20-desktop.webp
- public/images/banners/bf20-mobile.webp
- tests/integration/localBf20Browser.mjs
- docs/buen-fin-2026.md
