# Corrección del módulo de Despacho

## 1. La planilla se ajusta a las facturas seleccionadas

Hoy los cuadros se salen de la hoja y se montan encima de las firmas. Se corrige así:

- Se dibujan exactamente tantas filas como facturas seleccionadas, ni una más.
- Si hay muchas facturas, las filas y la letra se encogen automáticamente para que todo entre en una sola hoja (igual que en la imagen "Así debe quedar").
- Debajo de la última fila va la fila de totales (kilos y, cuando corresponde, venta).
- Más abajo, siempre dentro de la hoja, los 3 espacios de firma: CHOFER, FACTURACION y, centrado debajo, JEFE DEPOSITO, con sus textos en rojo, y "DESPACHO NRO:" abajo a la derecha.

## 2. Dos versiones de la relación completa

Al guardar se generan siempre:

- Relación completa con la columna VENTA visible (con todos los precios).
- Relación completa sin la columna VENTA, con las demás columnas ocupando ese espacio y el total solo de kilos.

## 3. Relaciones individuales por vendedor

De las facturas seleccionadas se arman planillas aparte, una por cada vendedor que aparezca (Gilberto, Carlos, Jorge, Nixon…), con el mismo encabezado y firmas.

- Las marcas van separadas: "JORGE GUERRA" y "JORGE GUERRA COCOLISO" salen como dos planillas distintas (igual con VIVERES y OLEICA).
- Las individuales sí muestran la columna VENTA.
- Al pulsar Guardar PDF se guardan todas juntas en la carpeta que elijas, con nombres claros por vendedor y fecha.

## 4. Vista previa editable

La vista previa deja de ser solo una imagen del PDF:

- Arriba se editan los datos del encabezado: zona, fecha, chofer y ayudante, vehículo, 500GR, 900GR, CARNE y AHUMADA.
- Abajo, una tabla donde se puede corregir cliente, fecha, factura, kilos, venta, zona y vendedor de cada fila, y quitar filas con un botón de eliminar.
- Los totales se recalculan solos al editar.
- Botones: "Actualizar vista" (regenera el PDF con los cambios), Imprimir y Guardar PDF, que usan siempre lo editado.
- Las correcciones hechas aquí son solo para la impresión y para lo que se escriba en el Excel del despacho; no alteran las facturas registradas de la semana.
- Cerrar la vista previa se arregla para que no bloquee el cambio de módulo.

## Detalles técnicos

- `src/lib/pdf.ts`: cálculo de alto de fila dinámico (`rowH = min(19, espacioDisponible / nFilas)`) con reducción proporcional del tamaño de letra y mínimos de legibilidad; bloque de firmas anclado a una posición fija desde el borde inferior; totales de kilos y venta; `buildAllDespachoPdfs` agrupa por vendedor completo (nombre + marca) para las individuales.
- `src/components/app/Despacho.tsx`: nuevo estado editable (copia de las facturas seleccionadas + encabezado) usado por vista previa, impresión y guardado; modal con formulario y tabla editable; regeneración del blob al aplicar cambios y limpieza de la URL del objeto.
- El guardado en el Excel cargado (hoja "RELACION DE DESPACHO CON TODOS") sigue igual y usa las filas ya editadas.
- Se reempaqueta el ejecutable de Windows 7 32 bits con estos cambios.
