# Productos del CheckList en los reportes y vista previa en Lista de Facturas

## 1. Productos al final de los reportes (Reportes)
En los PDF de **Relación de ventas diarias**, **Reporte de kilos por vendedor** y la **Previsualización por vendedor**, debajo de la lista de facturas (que queda igual) se añade:
- **Productos vendidos**: lista de cada producto (CUERO PP, ESPALDA, etc.) con kilos totales y %, tomada de los checklist asociados a las facturas que aparecen en ese reporte.
- **Productos por zona**: una sección por cada zona con los kilos de cada producto que compró esa zona, de mayor a menor.
- Nota al pie con cuántas facturas del reporte no tienen checklist asociado (no aportan productos).
- Se respetan las notas de crédito (kilos recibidos) y se ignoran las facturas anuladas.

## 2. Botón "Ver checklist" en Lista de Facturas
- Si una factura tiene un checklist asociado (con kilos cargados), aparece al lado un botón **Ver checklist**.
- Abre una ventana con el checklist completo de esa factura: cliente, vendedor, zona, fecha y cada producto con cantidad y kilos, más el total, con opción de imprimir.

## 3. Entrega
- Recompilar y entregar un nuevo ZIP para Windows 7 de 32 bits.

## Detalles técnicos
- Vínculo factura-checklist: número de `factura` del checklist (lado 1 y 2) comparado con `Invoice.factura` (trim), usando `aplanar` + `aplicarNotas`.
- `src/lib/reportesPdf.ts`: helper `seccionProductos(doc, filas)` reutilizando `agrupar` por producto y por zona; los tres builders reciben opcionalmente las filas de productos.
- `Reportes.tsx`: pasar las filas del checklist filtradas a las facturas del reporte.
- `ListaFacturas.tsx`: mapa factura→checklist y diálogo de vista previa (PDF con `checklistPdf` existente o tabla).
- Empaquetado con Electron 22 ia32, como la entrega anterior.
