# Vista correcta del checklist en Lista de facturas

## Cambio visible
- Al pulsar **Previsualizar**, se mostrará únicamente el checklist asociado a esa factura, aunque el registro original contenga dos checklist.
- La vista quedará vertical y legible, con una sola tabla: **Cantidad**, **Descripción del pedido** y **Peso**.
- El peso mostrado será el realmente recibido cuando exista una nota de crédito; sin nota de crédito se mantendrá el peso anotado en el checklist.
- Debajo de la tabla aparecerá un resumen de la nota de crédito, indicando cada producto afectado, kilos facturados, kilos recibidos y diferencia.
- Se conservarán los datos principales de la factura y la opción de imprimir, usando esta misma vista de una sola factura.

## Detalles técnicos
- Cambiar el vínculo factura-checklist para guardar también cuál lado corresponde a la factura (`principal` o `segundo`), no solo el registro completo.
- Crear un PDF específico para esta previsualización, en orientación vertical y sin el segundo formulario vacío.
- Aplicar la nota de crédito por producto mediante nombres normalizados; si un producto aparece en varias líneas, distribuir proporcionalmente sus kilos recibidos para no duplicar el ajuste.
- Mantener sin cambios la impresión normal del módulo CheckList y las demás pantallas.

## Verificación
- Comprobar facturas vinculadas al primer y al segundo checklist.
- Comprobar una factura sin nota de crédito y otra con nota de crédito.
- Verificar que previsualización e impresión muestren una sola tabla, derecha y con totales coherentes.
