# Ajustes en Registrar + nuevo módulo "Master de clientes"

## 1. Cambios en Registrar
- Quitar el texto "(se guarda en la hoja DIARIO)" de la casilla de víveres.
- Cambiar el título "Mortadelas vendidas (unidades)" por "Mortadelas vendidas (bultos)". Los números guardados no cambian, solo pasan a contarse como bultos (también en la planilla de despacho).

## 2. Nuevo módulo "Master de clientes"
Aparece en el menú y el administrador puede asignarlo a cada usuario igual que los demás módulos.

**Lista de clientes**
- Muestra todos los clientes que aparecen en las facturas registradas (sin repetir; se comparan sin importar mayúsculas ni espacios), con su lugar.
- Selector de mes (por defecto el mes actual según el calendario de la PC).
- Para cada cliente: columnas Semana 1, 2, 3, 4, 5 con los kilos sumados de sus facturas **marcadas en carpeta**, más el total del mes. Una semana con compra se resalta como "activo"; sin compra queda vacía.
- Semanas del mes según el calendario: Semana 1 = del día 1 al primer domingo, después de lunes a domingo (hasta 5 semanas; si un mes llega a tocar una sexta, esos días se suman a la Semana 5).
- La semana de cada factura se toma de la semana en que se registró (su lunes de semana de trabajo).
- Buscador por cliente y filtro Local / Foráneo / Todos.
- Las facturas anuladas no cuentan.

**Totales separados en Local y Foráneas**
- Tarjetas arriba con: kilos de zona local y kilos de zonas foráneas, por semana y total del mes.
- Cajas y unidades de víveres vendidas (facturas de víveres marcadas en carpeta), también separadas en local y foráneas.

**Zonas foráneas**
- Un apartado dentro del módulo para escribir la lista de lugares que son foráneos (agregar / quitar).
- Una factura cuenta como foránea si su "lugar" está en esa lista; si no, es zona local.
- La lista se guarda en la PC servidor y se comparte en todas las PC. Solo el administrador puede modificarla; los demás usuarios la ven.

**Funciona con Facturas en carpeta:** al marcar o desmarcar una factura en carpeta, el Master se actualiza solo.

**Qué datos ve cada usuario:** igual que ahora, cada usuario ve solo sus propias facturas, así que su Master suma solo sus clientes; el administrador ve todo.

## Detalles técnicos
- Registrar.tsx: cambios de texto.
- electron/server.cjs: añadir "master" a MODULOS; `db.config.zonasForaneas` con GET `/api/zonas-foraneas` (con permiso master) y PUT (solo admin); nuevo GET `/api/master?desde&hasta` que devuelve facturas en carpeta, no anuladas, filtradas con esMio (no solo la semana actual).
- api.ts: añadir el módulo a MODULOS. App.tsx: entrada del menú.
- Nuevo src/lib/master.ts: `semanaDelMes(fecha)`, `normalizarCliente`, `esForanea(lugar, lista)`, `agruparMaster(facturas, foraneas, mes)` + pruebas (master.test.ts) para el cálculo de semanas y la división local/foránea.
- Nuevo src/components/app/MasterClientes.tsx.
- Recompilar y entregar nuevo ZIP para Windows 7 32 bits (v4).
