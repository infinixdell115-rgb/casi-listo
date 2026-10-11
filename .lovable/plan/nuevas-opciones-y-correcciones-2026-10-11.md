# Nuevas opciones y correcciones

## 1. Nuevo módulo "Lista de facturas"
- Tabla con todas las facturas (no anuladas por defecto, con opción de ver anuladas).
- Filtros: vendedor, cliente, número de factura, zona (lugar), fecha desde/hasta, semana, tipo (víveres / normales).
- Orden por número correlativo de factura (numérico), no por orden de registro.
- Botones Editar y Eliminar por fila (con confirmación al eliminar).

## 2. Permisos de editar / eliminar
- El administrador siempre puede editar y eliminar.
- En "Usuarios", el admin podrá activar a cada usuario dos permisos nuevos: "Editar facturas" y "Eliminar facturas".
- El servidor de la oficina valida estos permisos (no solo se oculta el botón). Cada usuario sigue viendo solo sus propias facturas.

## 3. Checklist
- Quitar los campos "Jefe de depósito" y "Número de factura" del formulario.
- En el reporte de kilos por producto: poder editar y eliminar registros cargados por error.
- Añadir filtro por zona al reporte, para ver qué zonas llevaron más o menos mercancía.

## 4. Etiquetas azules ilegibles
- Corregir el color del texto en todas las etiquetas azules (ej. "0 SELECCIONADAS") para que la letra sea blanca y se lea siempre.

## 5. Planilla de despacho
- Unir las dos celdas repetidas en una sola que diga "MORTADELAS A DESPACHAR".
- Filtro en Despacho: Todas / Solo víveres / Solo normales.

## 6. Registrar factura
- El campo vendedor pasa a ser una lista desplegable con los vendedores ya conocidos (también se puede escribir uno nuevo).
- Si se marca "Factura de víveres", se añade automáticamente "VIVERES" al final del nombre del vendedor; ya no hay que escribirlo a mano.

## 7. Orden por correlativo en todo
- Todos los módulos que muestran facturas (Despacho, Carpeta, Novedades, Anulaciones, Supervisión, Reportes) ordenan por número de factura.

## 8. Módulo "Pendientes" rediseñado
- Solo para registrar clientes que quedaron pendientes de mercancía.
- Botón "Añadir pendiente": cliente, zona, vendedor y lista de productos (producto + cantidad/kilos) a facturar en el próximo despacho.
- Lista de pendientes con filtros, opción de marcarlo como resuelto, editar y eliminar.
- Se guarda en el servidor de la oficina con la misma separación por usuario.

## Detalles técnicos
- electron/server.cjs: nuevos permisos `facturas_editar`, `facturas_eliminar`; endpoints PUT/DELETE de factura validan permiso + `esMio`; nueva colección `db.pendientes` con CRUD; endpoints de edición/borrado de checklist.
- src/lib/api.ts y store.tsx: nuevos métodos; helper común `ordenarPorCorrelativo` (parse numérico del campo factura) usado en todos los listados.
- Nuevo componente ListaFacturas.tsx y entrada en el menú de App.tsx; Pendientes.tsx nuevo reemplaza el uso actual.
- Etiquetas: ajustar el componente badge en ui.tsx a `text-primary-foreground`.
- pdf.ts: fusionar la fila de encabezado duplicada.
- Tests existentes (filtros, mortadelas, checklistStats) se ejecutan tras los cambios.
