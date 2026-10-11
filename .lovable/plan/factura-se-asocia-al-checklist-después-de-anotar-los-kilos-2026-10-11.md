# Factura se asocia al checklist DESPUÉS de anotar los kilos

## Problema
Hoy el número de factura se pide al **crear** el checklist, pero el flujo real es: primero se anotan los kilos, luego se hace la factura, y recién entonces se asocia su número al checklist.

## Cambios

### 1. Crear checklist (Checklist.tsx)
- Quitar el campo "Factura (correlativo)" del formulario de creación (ambos lados).
- La opción "Llenar desde una factura registrada" se mantiene solo para autocompletar cliente/vendedor/dirección/fecha, pero ya no es el lugar donde se asocia la factura.

### 2. Asociar factura después de los kilos (ChecklistReporte.tsx → modal ChecklistKilos)
- En el modal "Anotar / editar kilos" agregar, por cada lado del checklist, un campo "Factura (correlativo)" con lista desplegable de las facturas registradas (ComboInput con los correlativos existentes, también editable a mano).
- El campo se guarda junto con los kilos al pulsar "Guardar kilos" (mismo `updateChecklist`, sin cambios en el servidor).
- El modal pasa a titularse "Anotar kilos y factura".

### 3. Lista de guardados
- La columna "Factura" y el filtro por factura se mantienen igual; ahora reflejan lo asociado desde el modal de kilos.

## Detalles técnicos
- Sin cambios en `electron/server.cjs` ni en la base de datos: `factura` ya existe en el checklist y `updateChecklist` ya lo persiste.
- `ChecklistKilos` recibe las facturas disponibles vía `useStore()` (igual que el formulario de creación).
- Verificación: `bunx tsgo --noEmit` y build de escritorio; se entrega nuevo ZIP para Windows 7 32 bits (Electron 22.3.27, win32 ia32).
