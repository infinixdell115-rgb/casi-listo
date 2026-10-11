# Reporte de productos por kilos en CheckList

## Lo que ya existe
- Cada checklist se guarda y queda **Pendiente**; se imprime; luego se usa **Anotar kilos** para escribir lo que devolvió almacén, y pasa a **Con kilos**.
- Hay un reporte simple con el total de kilos por checklist.

## Lo que se añade
1. **Lista de productos despachados**: de todos los checklist con kilos anotados se arma una lista donde cada fila es un producto (ej. pata, costilla, espalda ahumada) con fecha, factura, cliente, vendedor y kilos. Los dos checklist de cada hoja (lado 1 y 2) se cuentan, cada uno con su cliente.
2. **Filtros del reporte**: rango de fechas (desde/hasta) y vendedor (o todos).
3. **Rankings** (de mayor a menor, con kilos y % del total):
   - Productos que más salieron / que menos salieron.
   - Clientes que más compraron / que menos compraron.
   - Por vendedor: total de kilos, su producto más vendido y su mejor cliente; al abrir un vendedor se ven sus productos y clientes.
4. Los nombres de producto se agrupan sin importar mayúsculas, espacios o acentos ("Costilla" = "costilla ").
5. Los checklist pendientes (sin kilos) no cuentan en el reporte, pero se muestra cuántos quedan pendientes.
6. Botón para **imprimir/guardar el reporte en PDF**.

## Detalles técnicos
- Nuevo `src/lib/checklistStats.ts` con funciones puras: aplanar checklist a filas de producto, normalizar nombre, agrupar por producto/cliente/vendedor. Tests en vitest para agrupación, exclusión de pendientes y ranking.
- Reemplazar `ChecklistReporte` por pestañas: Productos · Clientes · Vendedores · Detalle.
- Sin cambios en el servidor: los datos ya se guardan en los checklist (`items[].kilos`).
