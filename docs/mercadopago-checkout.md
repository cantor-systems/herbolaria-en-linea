# Mercado Pago Checkout Pro

## Configuración requerida

Configura estas variables privadas en Vercel para los entornos donde se probará el checkout:

- `MERCADOPAGO_ACCESS_TOKEN`: Access Token de prueba durante la validación.
- `MERCADOPAGO_WEBHOOK_SECRET`: firma secreta de Webhooks de la misma aplicación.
- `NEXT_PUBLIC_SITE_URL`: URL pública HTTPS del despliegue, sin slash final.

No uses un Access Token en una variable `NEXT_PUBLIC_*`. Las URLs de retorno y de notificación se construyen desde `SITE_URL`, y Mercado Pago requiere HTTPS.

Además de `notification_url`, configura en Mercado Pago Developers el Webhook HTTPS del despliegue:

`https://TU_DOMINIO/api/mercadopago/webhook`

Activa notificaciones de pagos para la aplicación cuyas credenciales están en Vercel.

## Límites actuales

El repositorio no tiene base de datos ni cola durable. El webhook valida la firma y su antigüedad máxima de cinco minutos con el SDK oficial, vuelve a consultar el pago en Mercado Pago, verifica moneda, monto y referencia, y suprime reintentos sólo dentro de un proceso caliente. Esa memoria puede perderse o no compartirse entre instancias serverless.

Antes de producción se requiere un almacén persistente con, como mínimo:

- pedido y líneas valorizadas por el servidor;
- `external_reference` única;
- ID de preferencia e ID de pago únicos;
- transición idempotente de estados;
- datos de entrega y auditoría de eventos;
- una cola o trabajo reintentable para fulfillment.

`demoOrder` se conserva únicamente para enlaces antiguos de demostración y no es fuente de verdad de pagos. Tampoco se emite el evento analytics `purchase`: debe añadirse únicamente después de contar con confirmación durable e idempotencia por ID de pago.
