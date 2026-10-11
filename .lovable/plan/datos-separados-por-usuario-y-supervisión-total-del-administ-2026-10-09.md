# Datos separados por usuario y supervisión total del administrador

## Lo que vas a tener

**Cada usuario normal ve solo lo suyo**
- En Registrar, Pendientes, Novedades, Despacho, Anulaciones, Facturas en carpeta, Reportes y CheckList solo aparecen las facturas que **ese usuario registró**.
- Las novedades se cargan sobre sus propias facturas, y queda guardado quién cargó cada una y cuándo.
- Solo puede ver las relaciones de despacho que sacó él.
- El servidor hace esta separación. No es que la información de otros solo se oculte en pantalla: a un usuario nunca le llega.

**El administrador ve absolutamente todo**
- En todos los módulos ve las facturas de todos los usuarios, con una columna **"Registrado por"**.
- Un módulo nuevo, **"Supervisión"**, que solo ve el administrador. Tiene tres pestañas:
  1. **Facturas:** todas las facturas, con quién las registró.
  2. **Novedades:** cada novedad, con quién la cargó y la fecha.
  3. **Relaciones de despacho:** todas las relaciones que sacó cada usuario.
- Arriba hay filtros por **usuario**, **vendedor**, **cliente** y **rango de fechas**, con botones rápidos: Hoy, Esta semana, Este mes, Este año y Todo.

**Historial de relaciones de despacho (en el módulo Despacho)**
- Cada vez que se guardan los PDF o el Excel de una relación, queda registrada: fecha, chofer, vehículo, zona, mortadelas, las facturas que incluye y quién la sacó.
- Una nueva sección, **"Relaciones hechas"**, con filtros por período (día, semana, mes, año o rango libre), vendedor, cliente y zona.
- Desde cada relación del historial puedes **verla de nuevo, reimprimirla o volver a sacar sus PDF y su Excel**.
- El usuario normal solo ve su historial. El administrador ve el de todos y además puede filtrar por usuario.

## Importante
- Las relaciones que se sacaron antes de este cambio no quedaron guardadas, así que el historial empieza vacío.
- Las novedades que ya existen se muestran sin autor ("—"). Desde ahora queda registrado quién las carga.
- Las facturas que ya existen sí tienen guardado quién las registró, así que se separan bien desde el principio.
- Al terminar se entrega un nuevo ZIP para Windows 7 de 32 bits.

## Detalles técnicos
- `electron/server.cjs`:
  - `GET /api/facturas` filtra por `creado_por === u.usuario` cuando el usuario no es administrador. `PATCH /api/facturas/:id` responde 403 si la factura no es suya.
  - La novedad guarda `novedad_por`.
  - `GET /api/checklists` filtra igual, por quién lo creó.
  - Nueva colección `db.despachos` con `{ id, creado, creado_por, header, facturas: [snapshot de cada factura], tipo: "pdf" | "excel" }`. `POST /api/despachos` guarda una relación. `GET /api/despachos?desde&hasta` devuelve todas al administrador y solo las propias a los demás.
  - Nuevo endpoint `GET /api/supervision/facturas?desde&hasta`, solo para el administrador, para consultar más de una semana.
- `store.tsx`: se agregan `creadoPor` y `novedadPor` a `FacturaDb`. Se expone `registrarDespacho()`, que se llama desde `guardarPdfs` y `guardarExcel` en Despacho.
- Componente nuevo `Supervision.tsx` (pestañas y filtros) y nuevo `DespachosHechos.tsx`, que también se usa dentro de Despacho. Para reimprimir se reutilizan `buildAllDespachoPdfs` y `buildDespachoExcel` con lo guardado en el historial.
- La lógica de filtrado (período, vendedor, cliente, usuario) va en `src/lib/filtros.ts`, con pruebas en vitest.
- En `AGENTS.md` se agrega la regla: los datos por usuario se aíslan en el servidor según `creado_por`, y el administrador no tiene filtro.
- Se reconstruye y se vuelve a empaquetar con Electron para win32-ia32.
