# Reportes con lugar y filtro por zonas + exportar Lista de facturas

## 1. Lugar en los reportes de kilos
- **Reporte de kilos por vendedor (PDF):** se agrega la columna **LUGAR** al detalle de cada vendedor (Factura, Cliente, Fecha, Lugar, Tipo, Kilos, Venta).
- **Relación de ventas diarias:** ya trae la columna LUGAR; se mantiene igual.
- **Reporte de un vendedor por fecha** (el que se abre desde cada vendedor): también lleva la columna LUGAR.

## 2. Filtro por zonas en Reportes
- Junto a "Desde / Hasta" se agrega un selector **Zona** con casillas para marcar una o varias zonas (sacadas del lugar de las facturas del período), más "Todas".
- Todo lo de la pantalla respeta la selección: la lista por vendedor, los totales de kilos y ventas, los PDF de ventas diarias y kilos por vendedor, la impresión y la vista por vendedor. Funciona en Kilos y en Víveres.
- El PDF muestra en el encabezado las zonas filtradas (ej. "Del 05/10 al 11/10 · Zonas: BARINAS, GUANARE"), y el nombre del archivo lo indica.

## 3. Exportar Lista de facturas a PDF y Excel
- Dos botones nuevos en Lista de facturas: **Exportar PDF** y **Exportar Excel**.
- Exportan exactamente las facturas que se ven con los filtros activos, ordenadas por número de factura.
- Columnas: Cliente, Fecha, Factura, Kilos / Cajas-Und, Venta, Lugar, Vendedor, Estado (Anulada / Nota de crédito / Novedad).
- Al final, totales de facturas, kilos y venta (sin contar anuladas). El Excel lleva encabezado con título y período, totales con fórmulas, columnas con ancho y formato numérico.
- Los archivos se guardan en la misma carpeta de reportes y aparecen en "Ver reportes guardados"; el PDF también se puede previsualizar e imprimir.

## Detalles técnicos
- `src/lib/reportesPdf.ts`: columna LUGAR en `buildKilosVendedorPdf` y `buildVendedorPorFechaPdf` (ajustar anchos); nueva `buildListaFacturasPdf`.
- `src/components/app/Reportes.tsx`: estado `zonasSel: string[]`, opciones = `uniq(lugar)` de `rango`; filtrar `invoices` antes de `grupos` y exportaciones; texto de zonas añadido a `periodo`.
- `src/lib/excel.ts`: nueva `buildListaFacturasExcel(facturas, periodo)` con ExcelJS.
- `src/components/app/ListaFacturas.tsx`: botones que usan `filtradas` con `ordenarPorCorrelativo`, guardan vía `saveReporte`.
- Prueba pequeña para el filtro de zonas (que excluya facturas de otras zonas y que "todas" no filtre).
