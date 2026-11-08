# Motor comercial aislado de pedidos manuales (HERB-SYS-001D)

No expone rutas ni acciones administrativas, no crea pedidos y no importa clientes de Supabase, Mercado Pago o Resend. No implementa pagos, persistencia ni autenticación nueva. El checkout público no importa este módulo.

## Contrato y autorización

`quoteManualOrder(input, authorizationContext)` es server-only. El futuro caller debe comprobar la sesión existente y construir el contexto confiable `{ role: 'principal_admin', actor: 'shared_admin', customerSegment }`; nunca debe copiarlo de un payload. La validación de este contexto no sustituye la autenticación de una sesión. No existe atribución individual.

El input acepta IDs de producto y variante, cantidades de paquetes, método, modo de descuento y solicitud de cortesía. Rechaza campos adicionales, precios, totales, elegibilidad y roles enviados en ese objeto. Los motivos son obligatorios (10–500 caracteres) para especial y cortesía. Confirmación y auditoría persistente siguen reservadas a la futura operación de guardado; la cotización indica que requiere confirmación y no autoriza persistencia.

Los vendedores están deshabilitados, incluso en cálculo normal. El contrato reservado y la constante de 3500 puntos básicos sólo preparan aritmética futura; las pruebas de ese límite no habilitan sesiones ni operaciones de vendedor. Los montos fijos se rechazan.

## Catálogo explícito: manual-catalog-v1

La política no se deriva en ejecución de nombres, cantidades, precios, compareAtPriceCents o wholesaleEligible. Una política ausente, desconocida o inconsistente queda excluida como unreviewed. La revisión de abajo es explícita por ID.

| Variante | Política | Evidencia de clasificación |
|---|---|---|
| var-gotas-1 | eligible / regular_individual | Individual Moronel a precio regular dentro de la matriz comercial aprobada en HERB-WEB-010B y conservada en tests/checkout/shippingPricing.test.mjs; sin promoción incorporada documentada. |
| var-caps-1 | eligible / regular_individual | Individual Moronel a precio regular en la misma matriz aprobada y su regresión de catálogo. |
| var-hierba-1 | eligible / regular_individual | Individual Moronel de la matriz conservada de precios/presentaciones; la promoción documentada corresponde a sus paquetes. |
| var-gotas-3 | excluded / promotional_presentation | Presentación promocional comercial aprobada de 3 frascos. |
| var-gotas-5 | excluded / promotional_presentation | Presentación promocional comercial aprobada de 5 frascos. |
| var-gotas-10 | excluded / promotional_presentation | Presentación promocional heredada y oculta; mantiene su cotización en checkout, no nueva selección manual. |
| var-gotas-20 | excluded / promotional_presentation | Presentación promocional comercial aprobada de 20 frascos. |
| var-caps-3 | excluded / promotional_presentation | Presentación promocional comercial aprobada de 3 frascos. |
| var-caps-5 | excluded / promotional_presentation | Presentación promocional comercial aprobada de 5 frascos. |
| var-caps-10 | excluded / promotional_presentation | Presentación promocional heredada y oculta. |
| var-caps-20 | excluded / promotional_presentation | Presentación promocional comercial aprobada de 20 frascos. |
| var-hierba-3 | excluded / promotional_presentation | Paquete comercial con precio promocional documentado en el catálogo. |
| var-hierba-5 | excluded / promotional_presentation | Paquete comercial con precio promocional documentado. |
| var-hierba-10 | excluded / promotional_presentation | Paquete comercial con precio promocional documentado; sigue visible. |
| var-pkg-1 | excluded / promotional_bundle | Kit integral con precio especial explícito en su descripción comercial. |
| var-colesterol-trigliceridos-1 | excluded / unreviewed | Falta confirmación comercial explícita de elegibilidad; wholesaleEligible no es esa autorización. |
| var-higado-1 | excluded / unreviewed | Misma limitación de evidencia. |
| var-rinones-1 | excluded / unreviewed | Misma limitación de evidencia. |
| var-super-curcuma-1 | excluded / unreviewed | Misma limitación de evidencia. |
| var-super-propoleo-1 | excluded / unreviewed | Misma limitación de evidencia. |

Son 20 variantes: 3 elegibles, 11 presentaciones promocionales excluidas, 1 kit excluido y 5 pendientes de revisión. El buscador devuelve los 9 productos activos y sus 18 variantes visibles, con agotados deshabilitados si los hubiera. No modifica el catálogo ni su stock.

La cantidad comprada es número de presentaciones. `commercialUnitsPerPackage` cuenta unidades comerciales, no cápsulas internas ni mililitros. Para kits o composición sin revisión estructurada devuelve null y aviso; no interpreta descripciones ni ingredients.

## Cálculo y snapshot

Máximo 50 líneas de entrada y 99 paquetes por línea agregada. Se normalizan IDs, agregan duplicados y ordenan líneas antes de calcular. Se reutiliza priceCheckoutCart y sus reglas de precios, cupones, mayoreo y envío sin editarlo.

Modo normal: idénticos importes al checkout para la selección permitida. Modo especial: sustituye el descuento automático a nivel de pedido, mantiene los precios comerciales de presentaciones excluidas y aplica el porcentaje exclusivamente a la base elegible. No acepta cupón simultáneo. Conserva el cálculo de envío basado en subtotal previo a descuentos, presentaciones y elegibilidad de mayoreo; no suma el beneficio monetario normal al especial. El resultado informa ambos importes para revisión explícita, incluso si el especial es menos favorable.

Especial: floor(baseCents × percentageBps / 10000), con BigInt. Distribución proporcional por mayores residuos, desempate por identidad canónica y suma exacta. El redondeo de las reglas normales no se modifica. El administrador puede solicitar 0–10000 puntos básicos; un 0% o descuento inferior a un centavo no crea un ajuste efectivo.

Cortesía: sólo estándar, con motivo, exclusivamente por el costo normal realmente calculado. Si ya es gratuito no registra ajuste y devuelve courtesy_already_free. Exprés con cortesía se rechaza. Los umbrales y tarifas globales permanecen iguales.

Se devuelven snapshot serializable, reglas de envío, política del motor, elegibilidad por línea, contexto compartido, intención normalizada y dos SHA-256. requestFingerprint identifica esa intención; pricingFingerprint también incluye el cálculo y los snapshots. Cambiar precios cambia la segunda huella, no la intención. Estas huellas no son firmas, no autentican usuarios ni implementan idempotencia SQL; un futuro caller debe recalcular antes de persistir y resolver replays contra su registro durable.

Un total cero es calculable, conserva `persistenceImplemented: false` y agrega `zero_total_persistence_not_authorized`. No se agrega un centavo residual, un pago ficticio ni un estado aprobado.

## Verificación

`npm test` incluye las dos suites nuevas, con dependencias explícitamente inyectadas mediante el helper existente. Usan fixtures sintéticos y comparaciones de lectura con el catálogo; no cargan archivos de entorno ni SDKs de proveedores. No constituyen un aislamiento del sistema operativo ni validación de sesión, SQL, PostgREST o navegador.

Ejecutar también `npm run typecheck`, `npm run build` y `git diff --check`. La validación de este PR no habilita el módulo administrativo ni autoriza migraciones o publicación productiva.
