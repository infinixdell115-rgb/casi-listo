# Relaciones de despacho en PDF y Excel

## Cambios
- Mantener la opción actual para generar las relaciones en PDF.
- Añadir una opción separada para guardar las relaciones en formato Excel.
- Crear un solo archivo Excel por lote, con hojas separadas para la relación completa con venta, la completa sin venta y cada vendedor o marca individual.
- Reproducir en cada hoja el encabezado, las facturas seleccionadas, los totales y los espacios de firma.
- Guardar el Excel en `Documentos/Relaciones de despacho/DD-MM-AAAA`, junto a los PDF del día.
- Limpiar las facturas seleccionadas solamente cuando el archivo elegido se haya guardado correctamente.

## Verificación
- Confirmar que ambos botones funcionan de forma independiente.
- Abrir el Excel generado y comprobar sus hojas, datos, totales y formato.
- Confirmar que el archivo queda en la carpeta fechada y que las casillas se desmarcan después del guardado.

## Detalles técnicos
- La interfaz generará el libro con ExcelJS y lo enviará al proceso de escritorio para guardarlo automáticamente.
- Los nombres de hojas se limpiarán y limitarán al máximo permitido por Excel, evitando duplicados.
- La relación sin venta tendrá siete columnas; las demás conservarán las ocho columnas completas.
