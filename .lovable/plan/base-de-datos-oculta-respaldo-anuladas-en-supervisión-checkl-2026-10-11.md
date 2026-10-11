# Base de datos oculta, respaldo, anuladas en Supervisión, checklist por factura y notas de crédito

## 1. Base de datos en "BASE DE DATOS CIBAO" (oculta)
- Los datos se guardarán en `C:\Users\<usuario>\BASE DE DATOS CIBAO\`, y esa carpeta queda oculta en Windows.
- La primera vez que abras esta versión, los datos que ya tienes se copian solos a la nueva carpeta. No se pierde nada.
- El respaldo automático de cada día también se guardará en la nueva carpeta de respaldo (punto 2).

## 2. Botón "HACER RESPALDO"
- Habrá un botón **HACER RESPALDO** en la barra superior. Solo lo ve el administrador.
- Al pulsarlo, guarda una copia completa en `C:\Users\<usuario>\RESPALDO CIBAO\`, con la fecha y la hora en el nombre (ej. `respaldo-2026-10-11_14-30.json`). Luego muestra dónde quedó guardada.

## 3. Supervisión: pestaña "Facturas anuladas"
- Una pestaña nueva lista todas las facturas anuladas: fecha, factura, cliente, vendedor, kilos, motivo, quién la anuló y cuándo.
- Tiene los mismos filtros que las otras pestañas: usuario (quien la registró o quien la anuló), vendedor, cliente, período o rango de fechas.

## 4. CheckList ligado a una factura
- Cada checklist (lado 1 y lado 2) tendrá un campo **Factura (correlativo)**. Ahí eliges una factura registrada o escribes su número.
- En la lista de checklist guardados se ve la factura de cada uno, y puedes buscar por número de factura.
- Así cada factura tiene sus productos y sus kilos, que usa la nota de crédito.

## 5. Novedades: tipo "Nota de crédito"
- Al registrar una novedad eliges el tipo: **Normal** o **Nota de crédito**.
- Con Nota de crédito aparecen los productos de esa factura (sacados de su checklist con kilos). Por cada producto escribes los **kilos que sí recibió** el cliente. El programa muestra lo facturado, lo recibido y la diferencia.
- Si la factura no tiene checklist, escribes directamente el total de kilos recibidos.
- Los reportes (Kilos, Productos de CheckList, Supervisión) usan los **kilos recibidos** en lugar de los facturados. En la factura se muestra una marca "NC −X kg".
- La factura original no se cambia. Si quitas la nota de crédito, los reportes vuelven a contar los kilos originales.

## Entrega
Recompilar y entregar el ZIP para Windows 7 de 32 bits (v4).

## Detalles técnicos
- `electron/main.cjs`: `dataDir = path.join(os.homedir(), "BASE DE DATOS CIBAO")`, ocultarla con `attrib +h`, migrar una vez desde `userData/datos` si existe el JSON antiguo; `backupDir = ~/RESPALDO CIBAO`.
- `electron/server.cjs`: `POST /api/respaldo` (solo admin) escribe el JSON con fecha y hora y devuelve la ruta. Las facturas tienen un campo nuevo opcional `nota_credito: { items: {producto, facturado, recibido}[], kilos_recibidos, fecha, por }`, que se puede guardar y quitar por PATCH con las reglas de permisos actuales.
- `src/lib/store.tsx`: `kilosEfectivos(f)` = `nota_credito?.kilos_recibidos ?? kilos`, que se usa en todas las sumas de Reportes y `reportesPdf`. `checklistStats` usa los kilos recibidos por producto cuando hay nota de crédito para esa factura.
- `Supervision.tsx`: tab `anuladas` con datos de `/api/supervision/facturas` filtrando `anulada=true`.
- `Checklist.tsx`: `factura` pasa a ser selector o texto en ambos lados, más filtro por factura. `Novedades.tsx`: selector de tipo y editor de productos.
- Tests vitest para `kilosEfectivos` y para el ajuste en `checklistStats`.
