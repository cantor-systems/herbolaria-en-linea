# Consulta pública de pedidos

`POST /api/orders/tracking` permite consultar el estado post-compra únicamente con la combinación exacta de `public_order_number` y `customer_email`. El endpoint normaliza y valida ambos valores, usa el cliente privado de Supabase en el servidor y devuelve un DTO público que no contiene identificadores internos, datos personales, dirección, partidas ni totales.

Las consultas sin coincidencia devuelven el mismo `404` genérico, tanto si no existe el número como si el correo no corresponde. Todas las respuestas llevan `Cache-Control: no-store`. Las URLs de rastreo se publican únicamente para pedidos enviados y cuando son URLs HTTPS válidas.

## Hardening pendiente

El endpoint todavía no cuenta con rate limiting distribuido server-side o edge. No se implementa un contador en memoria porque cada instancia de Vercel mantendría estado independiente y daría una falsa garantía de protección. La combinación obligatoria de número público más correo y la respuesta genérica reducen la enumeración en esta primera versión, pero antes de una exposición de alto volumen se debe agregar un límite distribuido en el servidor o en el edge.
