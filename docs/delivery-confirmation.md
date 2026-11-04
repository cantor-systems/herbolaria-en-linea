# Confirmación manual de entrega

Implementación local de Etapa 2. No contiene operaciones de despliegue.

## Contrato

`mark_order_delivered(p_order_id uuid)` requiere `service_role`, pago aprobado
y un despacho existente. Bloquea la fila y permite `shipped → delivered`.
Repetir la RPC devuelve la fila sin ejecutar un UPDATE, conservando todas las
fechas. La primera confirmación guarda `delivered_at` y origen `admin_manual`.
Esa fecha corresponde a la confirmación administrativa, no a una fecha
certificada por la paquetería. No hay integración automática con transportistas.

La acción administrativa exige sesión y casilla explícita; el formulario empieza
sin aceptar y bloquea el botón durante el envío. La RPC conserva la protección
frente a concurrencia aunque se utilicen dos pestañas.

## Activación en dos fases

`DELIVERY_CONFIRMATION_ENABLED` es una variable exclusiva del servidor, sin
prefijo `NEXT_PUBLIC_`. Sólo el valor exacto `true` habilita la función. Ausente,
vacía, `false`, `TRUE`, `1` o valores con espacios la mantienen deshabilitada.
No se debe configurar durante la primera publicación compatible.

El detalle oculta el formulario mientras está deshabilitada. La Server Action
comprueba primero la sesión, valida el UUID y comprueba la activación antes de
leer pedidos o persistir. Una petición directa tampoco evita este control.
Cuando está habilitada siguen siendo obligatorios sesión, aceptación explícita
y estado aprobado/enviado; la RPC revalida el estado bajo bloqueo.

Cambiar esta variable en Vercel exige un **nuevo deployment** para que tenga
efecto, tanto para habilitar como para deshabilitar. No modifica las variables
de deployments ya existentes. El control afecta a la aplicación; no revoca la
RPC ni sustituye el control de acceso a `service_role`. Nunca invocar la RPC
manualmente para saltarse la fase de activación.

La entrega no genera correo ni WhatsApp. Un email de despacho pendiente o
fallido puede reintentarse después de entregar, con la misma clave de
idempotencia existente. WhatsApp sigue siendo manual, con consentimiento y
registro idempotente. Un fallo de notificación conserva el estado logístico.

## Tracking compatible

El único consumidor encontrado es `src/app/rastrear-pedido/page.tsx`.
Envía `X-Order-Tracking-Version: 2` en su POST existente. El servidor interpreta
exclusivamente el valor `2` como V2: puede devolver `delivered` y `deliveredAt`.
Sin encabezado, con `1` u otro valor devuelve el contrato V1: transforma
`delivered` en `shipped` y omite `deliveredAt`. Así las pestañas antiguas siguen
funcionando. Un cliente nuevo también reconoce todas las respuestas V1.

La búsqueda conserva número público y correo; no se agregan datos personales
al DTO. Guía, paquetería, URL, fecha de envío, errores y `no-store` se conservan.

## Validación sin servicios externos

Pruebas unitarias, UI y regresión (dependencias externas simuladas):

```powershell
npm test
```

Base nueva, desechable, exclusivamente local (Docker Desktop Windows):

```powershell
npm run test:db:delivery
```

El runner exige la imagen PostgreSQL ya disponible cuyo digest está fijado en
el script. No descarga imágenes ni acepta URLs o contenedores existentes.
Comprueba el motor local, identidad y etiqueta únicas, red `none`, ausencia de
puertos y montajes persistentes y datos en tmpfs antes del primer SQL. Crea
roles mínimos, aplica 001–010, inserta históricos sintéticos y prueba 011.
Verifica rollback ante error antes de COMMIT, permisos, estados, metadatos,
reintentos y dos sesiones concurrentes con espera de bloqueo comprobada.
El contenedor se elimina al terminar. No usar el SQL directamente en una
instancia Supabase existente, ni en la instancia previamente llamada staging.

Build con preload de protección de las APIs Node interceptadas:

```powershell
$env:NODE_OPTIONS="--require=$((Join-Path (Get-Location) 'tests/helpers/isolated-build.cjs'))"
npm run build
Remove-Item Env:NODE_OPTIONS
git diff --check
```

El preload bloquea las lecturas síncronas de `.env*` utilizadas por el cargador
actual de Next, retira variables de servicios, activación y proxy del proceso
y rechaza cualquier llamada a `fetch`, incluso loopback. Intercepta `request`
y `get` de `http`/`https`: combina URL y opciones en una única copia, valida
protocolo, hostname/host, puerto y path efectivos y sólo envía esa copia a Node.
Normaliza `localhost` a `127.0.0.1` sin DNS y permite únicamente las direcciones
literales de loopback previstas. Fija un agente propio sin proxy; agentes de
usuario, lookup, conectores, socket paths y opciones no soportadas fallan de
forma cerrada. HTTP/HTTPS nativos no siguen redirecciones automáticamente;
`fetch` permanece bloqueado para evitar sus redirecciones y dispatchers.

Es una protección limitada del proceso Node, **no un aislamiento de red del
sistema operativo ni un sandbox para ejecutar código no confiable**. No cubre
sockets directos, APIs no interceptadas, código nativo ni procesos que eviten
el preload. Los servicios loopback deben ser conocidos y no reenviar tráfico
a Producción. Si el build necesita un transporte rechazado, detenerse: no
retirar el guard ni habilitar servicios/credenciales para conseguir que pase.
Las pruebas del helper usan únicamente clientes en memoria, sin red. Las
pruebas SQL mantienen su contenedor independiente con `--network=none`.

El workflow `.github/workflows/ci.yml` ejecuta `npm test` antes de `npm run build`,
sin `continue-on-error`; una prueba fallida impide el build. Las pruebas usan
datos sintéticos, dependencias simuladas y no necesitan variables productivas.
El preload es sólo una herramienta local; no se añade al build productivo.

## Revisión y compatibilidad operativa

La migración 011 debe estar aplicada antes de utilizar este código en un entorno
autorizado: las consultas seleccionan columnas nuevas. No se aplicó fuera de la
base desechable. No convierte históricos ni modifica pagos, importes o eventos.

011 usa una transacción y `lock_timeout = '5s'`; toma `ACCESS EXCLUSIVE` sobre
orders para cambiar columnas, constraints y funciones. Mantiene instalado el
trigger de protección y reemplaza su función sin ventana de reversiones.
El timeout limita la espera de bloqueo; la validación de constraints puede
mantener el bloqueo durante el escaneo de la tabla, hasta COMMIT o ROLLBACK.
No garantiza una ventana de cinco segundos ni limita la duración total de la
migración. Mientras espera o mantiene el bloqueo puede retrasar consultas,
creación de pedidos y persistencia de pagos, hasta agotar timeouts de solicitudes
o webhooks. No detiene pagos en el proveedor. Evaluar duración en una base
aislada representativa y reservar una ventana controlada antes de autorizarla.

El código anterior puede usar el esquema ampliado mientras sólo existan
`pending` y `shipped`: las columnas nuevas son nulas y las RPC conservan sus
contratos. No reconoce `delivered`; su tracking, panel y normalización de
notificaciones son incompatibles con ese estado. V1/V2 protege al navegador
antiguo atendido por el servidor nuevo, no al servidor antiguo leyendo entregas.
El código nuevo con esquema antiguo tampoco es compatible: detalle y tracking
seleccionan columnas inexistentes y la RPC de entrega no existe.

### Procedimiento propuesto; no ejecutar sin autorización separada

1. Preparar y revisar el PR sin integrarlo. Confirmar el destino exacto de la
   base, historial 001–010, definiciones/ACL/trigger esperados, ausencia de una
   aplicación parcial de 011, respaldo y recuperación acordados. Comprobar por
   agregados sin datos personales que todavía no existen entregas confirmadas.
   No usar como prueba la instancia antes identificada erróneamente como staging.
2. Confirmar que la variable de activación está ausente o deshabilitada en
   todos los deployments candidatos, y que no habrá invocaciones manuales de
   la RPC. Revisar los automatismos reales de Vercel antes de integrar: no hay
   configuración versionada que pruebe sus ajustes remotos. El workflow sólo
   instala, prueba y construye; no ejecuta migraciones ni publica código.
3. Mantener el código anterior y aplicar 011 una sola vez por el procedimiento
   de migraciones autorizado, en la ventana acordada. No integrar el PR ni
   publicar el código nuevo antes de que COMMIT y la recarga de esquema de
   PostgREST estén confirmados. Registrar la versión por ese procedimiento.
4. Verificar columnas, constraints, funciones completas, permisos y permanencia
   del trigger mediante metadatos, sin confirmar entregas. Si el código fuese
   integrado antes por otra razón, bloquear expresamente cualquier publicación
   automática hasta completar estas verificaciones; no asumir esa protección.
5. Integrar el PR y publicar la versión compatible con la activación todavía
   deshabilitada. Verificar el commit publicado y su configuración; completar
   la validación con fixtures en el entorno realmente aislado, sin operaciones
   sobre pedidos reales. Resolver la coexistencia de versiones antiguas con
   acceso a la misma base, incluidas URLs de deployments anteriores; retirar
   de operación o restringir las incompatibles y renovar pestañas administrativas.
6. Sólo después de verificar la versión compatible y los consumidores, autorizar
   una segunda fase: configurar el valor exacto `true` y crear otro deployment.
   **Prohibido activar confirmaciones antes de publicar y verificar esa versión.**

Detenerse ante destino o esquema inesperados, ejecución parcial, permisos
distintos, presencia prematura de `delivered`, falta de control sobre la
publicación automática o bloqueo que exceda la ventana acordada. No forzar
locks, no repetir a ciegas la migración y no publicar código dependiente de ella.
Ante error/lock timeout, asegurar ROLLBACK y cierre de la sesión del ejecutor,
comprobar esquema e historial y resolver la causa antes de reprogramar. Los
fallos de persistencia de pagos se revisan por el mecanismo existente; nunca
se crean nuevos cobros como recuperación de una migración.

Antes de COMMIT, un error revierte toda la migración. Después de registrar
entregas, no es seguro volver al código anterior ni retirar el nuevo estado:
se perdería su representación o trazabilidad. Preferir corrección hacia adelante
y conservar columnas y registros; cualquier reversión posterior requiere otro
diseño aprobado. No convertir `delivered` a `shipped` como rollback automático.
Antes de la primera entrega se puede volver al código anterior conservando 011.
Después, utilizar una versión compatible con activación deshabilitada. Para
una desactivación, publicar de nuevo y retirar de operación las versiones que
sigan habilitadas: cambiar la variable no revoca deployments ni solicitudes
ya iniciadas. No se ha modificado 011 para estas correcciones.

Las pruebas cubren PostgreSQL real y módulos reales con proveedores simulados.
No constituyen validación de PostgREST, sesión/cookies en un navegador ni de
Resend real. La revisión de TARS debe mantener datos sintéticos y aislamiento.
