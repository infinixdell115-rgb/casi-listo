# Eliminar y visualizar relaciones de despacho + fecha en víveres

## 1. Botón "Eliminar" en Relaciones de despacho
- Nuevo botón (papelera) en cada fila de la lista de relaciones hechas, también en la pestaña de Supervisión.
- Visible solo para el administrador, o para usuarios a quienes el administrador active el nuevo permiso **"Eliminar relaciones de despacho"** en la pantalla de Usuarios.
- Pide confirmación antes de borrar. Al eliminar, la relación desaparece del historial en todas las PC (las facturas no se tocan).
- El servidor de la oficina también valida el permiso, así no se puede borrar sin autorización.

## 2. Botón "Visualizar"
- 4to botón (ojo) junto a Imprimir, PDF y Excel.
- Abre una ventana dentro del sistema con la relación de despacho tal como se imprime, con botones para cerrar o imprimir desde ahí.

## 3. Fecha de facturación en facturas de víveres
- Al marcar "Factura de víveres", aparece el campo **Fecha de facturación** (por defecto hoy), y se guarda con la factura.

## Detalles técnicos
- `electron/server.cjs`: añadir `despachos_eliminar` a `MODULOS`; nuevo `DELETE /api/despachos/:id` con `puede(u,"despachos_eliminar")` + `esMio`, `guardar()` y `avisar("despachos")`.
- `src/lib/api.ts`: añadir el permiso a la lista de módulos con etiqueta.
- `DespachosHechos.tsx`: botones Visualizar (modal con iframe del `buildPreviewPdf` como blob URL) y Eliminar (condicional por permiso).
- `Registrar.tsx`: campo fecha en el bloque víveres; enviar `fecha` en lugar de `""`.
- Al final, regenerar el ZIP para Windows 7 32 bits.
