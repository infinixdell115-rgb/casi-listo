# Logo, facturas de limpieza y tres Máster de clientes

## 1. Logo en el menú lateral

- Sustituir el título grande “Facturación” por el logo oficial de El Cibao en la esquina superior izquierda marcada en la imagen.
- Mantener debajo el texto **“Relación de Ventas Diarias”**, con tamaño y contraste legibles dentro del menú.
- Reutilizar el mismo logo ya incorporado en los PDF y en el ícono del programa, sin introducir otra versión de la marca.

## 2. Facturas de productos de limpieza

- Añadir en **Registrar factura** una segunda casilla llamada **“Factura de productos de limpieza”** junto a la de víveres; solo una categoría especial podrá estar marcada a la vez.
- Al marcarla, mostrar el mismo formato de captura de víveres: cliente, fecha, número de factura, cajas, unidades, venta, zona y vendedor.
- Guardar cada factura con una categoría explícita: **embutidos**, **víveres** o **productos de limpieza**. Las facturas antiguas seguirán reconociéndose automáticamente como embutidos o víveres, sin perder datos.
- Conservar cajas y unidades de limpieza en la PC servidor y mantener el aislamiento actual: cada usuario ve sus propias facturas y el administrador ve todas.
- Mostrar correctamente la categoría y sus cajas/unidades en pendientes y en las pantallas que actualmente distinguen las facturas normales de las de víveres.

## 3. Máster de clientes por categoría

- Mantener la tabla actual como **“Máster de clientes — Embutidos”**, mostrando kilos por semana y total mensual.
- Añadir debajo **“Máster de clientes — Víveres”**, con cajas y unidades compradas por cada cliente en cada semana y los totales del mes.
- Añadir una tercera tabla separada: **“Máster de clientes — Productos de limpieza”**, también con cajas y unidades semanales y mensuales.
- Aplicar el mismo mes, buscador y filtro Local/Foránea a las tres tablas.
- Contar únicamente facturas marcadas **en carpeta** y no anuladas, igual que en el Máster actual.
- Mantener azul la semana con compra y pintar rojo cada semana sin compra para ese cliente, en las tres tablas.
- Seguir calculando las semanas como hoy: del día 1 al primer domingo, luego lunes a domingo, acumulando una posible sexta semana en la quinta.

## 4. Comprobaciones

- Añadir pruebas para verificar la separación entre embutidos, víveres y limpieza; cajas y unidades; semanas con y sin compra; facturas en carpeta; anuladas; y zonas local/foránea.
- Probar el registro de una factura de limpieza, su guardado y su aparición exclusiva en el Máster de limpieza.
- Revisar visualmente el logo y las tres tablas en la aplicación de escritorio.

## Detalles técnicos

- La categoría se añadirá de forma compatible al archivo local de datos y al recorrido Registrar → pendientes → servidor → Máster.
- Se conservará el indicador existente de víveres para no romper datos, reportes ni relaciones anteriores; la nueva categoría explícita será la fuente para las tres tablas.
- Se actualizarán los tipos, la clasificación y el cálculo del Máster con pruebas unitarias concretas.