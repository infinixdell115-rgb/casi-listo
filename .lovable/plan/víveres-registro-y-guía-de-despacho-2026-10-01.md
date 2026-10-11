# Víveres: registro y guía de despacho

## 1. Registro de víveres
- En "Registrar" se agrega una casilla **"Factura de víveres"**. Al marcarla, el formulario cambia a: Cliente, N° de factura, N° de cajas, N° de unidades, Venta, Zona y Vendedor.
- Se guardan en la hoja **DIARIO** del mismo Excel semanal, en la primera fila libre (desde la fila 6), con su número de ITEM, sin tocar colores ni formatos.
- El vendedor se escribe tal cual (ej. "JORGE GUERRA VIVERES"); el programa no le agrega nada.

## 2. Despacho de víveres
- En "Despacho" aparecen también las facturas de DIARIO junto con las normales.
- Una factura cuenta como víveres si su vendedor **termina en "VIVERES"**.
- Al generar las relaciones:
  - Las de víveres salen con el formato de la hoja **GUIA DE DESPACHO**: logo, zona, fecha, chofer, ayudante, vehículo, vendedor y teléfono, cajas totales, total de facturas, y tabla ITEM / CLIENTE / FACTURA / N. CAJAS / UND / VENTA / ZONA / VENDEDOR. Solo las filas necesarias.
  - Las demás siguen saliendo con su planilla normal, sin mezclarse.
- Funciona igual en PDF, Imprimir y Guardar Excel, y se guarda en la carpeta de la fecha.
- Si el Excel no tiene las hojas DIARIO o GUIA DE DESPACHO, el programa avisa en vez de fallar.

## 3. Pendientes del checklist
- Se termina lo que quedó a medias: campos del segundo checklist, búsqueda por los dos, impresión vertical, revisión.

## Detalles técnicos
- `types.ts`: `ViveresInvoice` {cliente, factura, cajas, und, venta, zona, vendedor}; helper `isViveres(vendedor)` = termina en VIVERES.
- `excel.ts`: leer/escribir DIARIO (encabezado fila 5, datos desde 6: A ITEM, B CLIENTE, C FACTURA, D CAJAS, E UND, F $$$, G LUGAR, H VENDEDOR); hoja de guía en el Excel de salida (C3 zona, H3 fecha, C4 chofer, C5 ayudante, C6 vehículo, F8 cajas totales, H8 total facturas, filas desde 10).
- `pdf.ts`: `buildGuiaViveresPdf` vertical carta; `buildAllDespachoPdfs` separa víveres de normales.
- Encabezado del despacho: se agregan los campos ayudante y vendedor/teléfono para la guía.
- Reempaquetar el ejecutable de Windows 7 32 bits.
