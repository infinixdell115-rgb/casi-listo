# Reportes: carpetas por fecha, previsualización, Víveres y productos del CheckList

## 1. Guardado en carpetas
- Todos los PDF del módulo Reportes se guardan sin preguntar en:
  `Documentos\REPORTES DE KILOS, LIMPIEZA Y VIVERES\<AAAA-MM-DD>\` (fecha del día en que se crea el archivo).
- Si ya existe un archivo con el mismo nombre se le añade la hora para no sobrescribirlo.
- Al guardar aparece un aviso con la ruta.

## 2. Botón "Previsualizar" al lado de cada vendedor
- Abre una ventana dentro del sistema con el PDF del reporte de kilos de ese vendedor, en el rango Desde/Hasta elegido.
- Sus facturas aparecen agrupadas por fecha, con subtotal de kilos y venta por día y total final.
- Desde la ventana: Guardar (en la carpeta del día) o Imprimir.

## 3. Botón "Ver reportes guardados"
- Debajo, un botón abre una lista de las carpetas por fecha (más reciente primero) y sus archivos.
- Al hacer clic en un archivo se ve el PDF dentro del sistema, con opción de imprimir o abrir la carpeta en Windows.

## 4. Pestañas en Reportes
Reportes queda dividido en: **Kilos** · **Víveres** · **Productos (CheckList)**.
- **Kilos**: lo actual (facturas de carne, sin víveres) + los botones nuevos.
- **Víveres**: mismas fechas Desde/Hasta; por vendedor muestra facturas de víveres con cajas, unidades y venta, con previsualizar/guardar/imprimir igual que Kilos.
- **Productos (CheckList)**: usa los checklist ya con kilos cargados; muestra por vendedor (asesor) cuántos kilos vendió de cada producto, en el mismo rango de fechas, con total por vendedor y PDF para previsualizar/guardar.
  - Se mueve aquí el reporte de productos que hoy está en CheckList (en CheckList queda un acceso directo).

## Detalles técnicos
- `electron/main.cjs` + `preload.cjs`: nuevos IPC `reporte-save(name, data)` (crea carpeta del día, devuelve ruta), `reportes-list()` (carpetas y archivos), `reporte-read(path)` (bytes, validando que esté dentro de la carpeta base), `reporte-open-folder`.
- `src/lib/desktop.ts`: `saveReporte`, `listReportes`, `readReporte`; en navegador cae en descarga.
- `src/lib/reportesPdf.ts`: `buildKilosVendedorPdf` acepta un solo vendedor y agrupa por fecha; nuevo `buildViveresVendedorPdf`; nuevo PDF de productos por vendedor reutilizando `checklistStats` (`agrupar` por producto dentro de cada vendedor).
- Nuevo componente `PdfPreview` (diálogo con `<iframe>` sobre blob URL).
- Reportes separa facturas por `diario` (víveres) vs. normales.
- Recompilar y entregar nuevo ZIP para Windows 7 32 bits.
