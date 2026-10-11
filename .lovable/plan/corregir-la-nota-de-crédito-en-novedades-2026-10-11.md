# Corregir la nota de crédito en Novedades

## Qué pasa hoy
La factura 23498 está registrada con 50.10 kg, pero su checklist suma unos 116 kg. El programa compara "lo que recibió" (suma del checklist) contra los kilos de la factura, y por eso dice que recibió más de lo facturado aunque en realidad recibió menos.

## Qué se cambia
- La revisión se hace **producto por producto**: solo da error si en algún producto se anota más de lo que dice el checklist (por ejemplo, más de 22.32 en ESPALDA).
- La nota de crédito será la **suma de las diferencias** (ej. ESPALDA 22.32 → 22.01 = 0.31 kg de nota de crédito).
- Los kilos de la factura que cuentan en los reportes = kilos de la factura − esa diferencia (50.10 − 0.31 = 49.79). Los kilos originales no se tocan y el checklist no se modifica.
- En los reportes de productos, ESPALDA de esa factura cuenta 22.01 (como ya hace hoy cuando hay nota de crédito).
- El resumen debajo de la tabla mostrará: "Nota de crédito: −0.31 kg · Kilos de la factura: 49.79 kg".
- Se aceptan números con coma o punto (22,01 o 22.01).

## Entrega
- Nuevo ZIP para Windows 7 de 32 bits.

## Detalles técnicos
- `Novedades.tsx`: `diferencia = Σ max(0, facturado − recibido)`; validar `recibido ≤ facturado` por ítem; `kilos_recibidos = facturadoFactura − diferencia`. Sin checklist se mantiene el campo de total.
- Badge "NC" en la lista sigue usando `kilos_recibidos − kilosFacturados`, que ahora da la diferencia correcta.
