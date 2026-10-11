# Filtro por rango de fechas en el reporte de kilos + ZIP para Windows 7 32 bits

## Problema
El módulo de Reportes solo muestra los kilos de la semana seleccionada. Se agregará un filtro "desde / hasta" para calcular kilos entre dos fechas cualesquiera, y se entregará el programa empaquetado en ZIP para Windows 7 de 32 bits.

## Cambios

### 1. Filtro de fechas en el reporte
- **Servidor (`electron/server.cjs`)**: el endpoint `GET /api/facturas` aceptará los parámetros `desde` y `hasta` (yyyy-mm-dd) para filtrar facturas por fecha, además del filtro por semana actual.
- **Pantalla de Reportes (`src/components/app/Reportes.tsx`)**:
  - Dos campos de fecha ("Desde" y "Hasta"), por defecto el lunes y domingo de la semana actual.
  - Al cambiar el rango, se consultan las facturas de ese período (excluyendo anuladas) y se recalculan los totales de kilos, ventas y el detalle por vendedor/marca.
- **PDFs (`src/lib/reportesPdf.ts`)**: ambos reportes (kilos por vendedor y relación de ventas diarias) aceptarán un subtítulo de período opcional, mostrando "Del DD/MM/AAAA al DD/MM/AAAA" cuando se use un rango personalizado. El nombre del archivo descargado incluirá el rango de fechas.

### 2. Empaquetado para Windows 7 32 bits
- Windows 7 solo soporta Electron hasta la versión 22 (las versiones nuevas requieren Windows 10+). Se empaquetará con Electron 22 en modo `win32 / ia32` usando `@electron/packager`.
- Se generará el build de la app y el paquete `win32-ia32`, comprimido en un ZIP entregado en Files.

## Verificación
- Build sin errores y revisión visual del filtro en la vista previa.
- Inspección del contenido del ZIP antes de entregarlo.
