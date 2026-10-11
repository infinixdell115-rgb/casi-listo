# Quitar el filtro por semana y filtrar solo por fechas

## Problema
En Reportes, con Desde 28/09/2026 y Hasta 05/10/2026 no aparecen facturas aunque existen. Ahora mismo todo el sistema depende del selector "Semana del lunes": las facturas se cargan por semana y los filtros de fecha se aplican encima. Si una factura tiene la fecha guardada en otro formato (por ejemplo 28/09/2026 en vez de 2026-09-28, o con hora) o quedó en otra semana, no entra en el rango.

## Cambios
1. **Quitar "Semana del lunes"** de la barra superior de todo el programa.
2. **Cargar todas las facturas** (no solo las de una semana) y filtrar en cada módulo por fecha de la factura.
3. **Reportes (Kilos, Víveres, Productos)**: Desde / Hasta (por defecto: del lunes de esta semana a hoy) + filtros de Vendedor y Zona. Totales, previsualización y PDF usan ese rango.
4. **Despacho, Lista de facturas, Novedades, Carpeta, Anulaciones, Supervisión, Pendientes, Checklist**: el filtro pasa a ser Desde / Hasta (más los filtros que ya tienen de vendedor, zona, cliente, usuario). La opción "Esta semana" del filtro rápido se cambia por "Hoy / Últimos 7 días / Este mes / Rango".
5. **Registrar factura**: la fecha de la factura es la única referencia; la semana se sigue calculando sola por dentro (solo para compatibilidad con datos viejos), sin mostrarse.
6. **Fechas en cualquier formato**: el servidor convierte todas las fechas (2026-09-28, 28/09/2026, 28-9-2026, con hora) a un formato único al comparar, y corrige las ya guardadas al arrancar, para que nunca vuelvan a quedarse fuera.
7. Entregar el ZIP para Windows 7 32 bits (v6).

## Detalles técnicos
- `electron/server.cjs`: helper `normFecha()`; migración única `db.fechasNormalizadas` que reescribe `fecha` de facturas/checklists/pendientes a yyyy-mm-dd; GET /api/facturas filtra por `desde`/`hasta` con fechas normalizadas; `semana` y `fechaSemana` se ignoran si no vienen (sin límite por defecto).
- `src/lib/store.tsx`: `invoices` = todas las no anuladas del usuario (respeta `esMio`); se elimina `setSemana` de la UI; `semana` queda derivado de la fecha al guardar.
- `App.tsx`: se elimina el selector. `FiltroBar.tsx`: nuevos periodos predefinidos.
- `Reportes.tsx` / `Despacho.tsx`: eliminan la lógica `esSemanaActual`/`fechaSemana`, filtran sobre el conjunto completo.
- Typecheck, tests de checklistStats y empaquetado Electron 22.3.27 ia32.
