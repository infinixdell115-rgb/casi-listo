# Facturas que faltan en Despacho y nuevo usuario administrador

## 1. Facturas registradas que no aparecen en Despacho
Hoy Despacho solo muestra las facturas guardadas en la **semana seleccionada** arriba (según la semana en que se registraron, no la fecha de la factura). Causa más probable: una factura registrada con la semana de un lunes y una fecha de otra semana (o registrada cuando estaba elegida otra semana) queda "escondida" en esa otra semana. No puedo ver los datos de tu equipo, así que no está confirmado; el arreglo cubre este caso y los relacionados:

- Despacho buscará las facturas por **fecha de la factura** dentro de la semana elegida (lunes a domingo), sin importar en qué semana se registraron.
- Se añade un filtro **Desde / Hasta** opcional en Despacho para buscar facturas de cualquier rango.
- El filtro "Tipo" (víveres / normal) usará también la marca de víveres de la factura, para que ninguna factura de víveres quede fuera.
- Las facturas anuladas siguen sin aparecer (a propósito).

Si después de esto todavía falta alguna, dime el número de factura y lo reviso puntualmente.

## 2. Usuario administrador
- Usuario: **ADMINISTRADOR**, contraseña: **123456**.
- Al abrir el programa, la cuenta de administrador existente se renombra y se le pone esta contraseña (una sola vez), conservando todos los datos y facturas. Las facturas que creó como "Admin" se siguen viendo porque el administrador ve todo.
- La pantalla de inicio sugerirá "ADMINISTRADOR" como usuario.

## 3. Entrega
- Nuevo ZIP para Windows 7 de 32 bits.

## Detalles técnicos
- `electron/server.cjs`: `GET /api/facturas` acepta `fechaSemana=<lunes>` (filtra `fecha` entre lunes y domingo, o `semana` igual si la factura no tiene fecha). Constantes `ADMIN="ADMINISTRADOR"`, `ADMIN_CLAVE="123456"`; migración al iniciar: si existe admin con usuario distinto de ADMINISTRADOR y no se ha migrado (`db.adminMigrado`), renombrar y re-hashear.
- `Despacho.tsx`: carga sus propias facturas vía `api` con `fechaSemana` o `desde/hasta`, filtra `!anulada`, ordena con `ordenarPorCorrelativo`; filtro tipo = `i.diario || isViveres(i.vendedor)`.
