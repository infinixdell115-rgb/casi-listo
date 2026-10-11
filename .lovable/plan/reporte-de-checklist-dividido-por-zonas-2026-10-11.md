# Reporte de checklist dividido por zonas

## Objetivo
En el reporte de checklist (Reportes → Checklist), poder ver qué mercancía se vendió más o menos **dentro de cada zona**, no solo el total por zona.

## Estado actual (verificado)
- `src/components/app/ChecklistReporte.tsx` ya tiene: filtro por zona (selector), pestaña "Zonas" con un ranking de kilos por zona, y tarjeta destacada de zona más/menos vendida.
- Lo que falta: el desglose de **productos por zona** (qué productos se vendieron más o menos en cada zona), tanto en pantalla como en el PDF impreso.

## Cambios

### 1. Pestaña "Zonas" con desglose por producto (ChecklistReporte.tsx)
- Convertir la pestaña "Zonas" en tarjetas expandibles por zona (igual que la pestaña "Vendedores"):
  - Cada zona muestra: total de kilos, producto más vendido y producto menos vendido.
  - Al expandir: ranking completo de productos de esa zona (veces, kilos, %) y ranking de clientes de la zona.
- Mantener el filtro de zona existente: al elegir una zona, todas las pestañas (productos, clientes, vendedores, detalle) ya muestran solo esa zona.

### 2. PDF impreso (src/lib/checklistReportePdf.ts + ChecklistReporte.tsx)
- Cuando no hay zona seleccionada, agregar al PDF una sección por cada zona: "ZONA: <nombre>" con su ranking de productos (de mayor a menor kilos), además de las secciones actuales.
- Cuando hay una zona seleccionada, el PDF ya queda filtrado a esa zona (sin cambios).

### 3. Resumen destacado
- En las tarjetas destacadas, la tarjeta "Zona" ya muestra la zona más/menos vendida; se mantiene.

## Detalles técnicos
- Reutilizar las funciones existentes `agrupar(filas, "zona")` y `agrupar(filas, "producto")` de `src/lib/checklistStats.ts`; no se toca la lógica de datos.
- Solo se modifican `src/components/app/ChecklistReporte.tsx` y `src/lib/checklistReportePdf.ts`.
- Verificar con una captura del preview que la pestaña Zonas muestra el desglose expandible.
