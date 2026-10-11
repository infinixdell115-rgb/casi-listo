# Programa de Facturación y Despacho — El Cibao

Aplicación de escritorio para Windows (instalable como ejecutable) que registra facturas dentro del mismo archivo Excel que ya usas, y genera las planillas de despacho en PDF idénticas al formato actual.

## Lo que se construye

### 1. Archivo de Excel (arriba de todo)
- Botón para abrir el archivo de la semana y botón "Cambiar archivo".
- Los datos se guardan **dentro del mismo archivo abierto**, sin crear copias nuevas y sin tocar colores, filtros ni formatos.
- Al cambiar de archivo, la pantalla queda totalmente limpia: nada de la semana anterior se queda guardado en el programa. Todo (novedades, facturas en carpeta, despachos pendientes) vive junto al archivo abierto.

### 2. Registrar facturas
Campos: Cliente, Fecha de facturación, Orden de entrega, Kilos, Venta ($), Lugar, Vendedor y hoja destino (LUNES a VIERNES).
- Cliente, Lugar y Vendedor con lista desplegable de los valores ya existentes en el archivo, y también se pueden escribir nuevos.
- Lista de "pendientes por guardar" y un botón para escribirlos todos en la hoja del día elegido, en la primera fila libre debajo de la última factura.

### 3. Despacho
- Se eligen facturas ya registradas (filtrando por vendedor, lugar y fecha) y sus datos se cargan solos: cliente, fecha, factura, kilos, venta, zona y vendedor.
- Campos manuales: Zona de despacho (con lista de zonas ya usadas), Chofer y ayudante, Vehículo asignado, Fecha de despacho, y 500GR / 900GR / CARNE / AHUMADA como campos de texto o número (no casillas).
- Tres botones: **Vista previa**, **Guardar PDF** e **Imprimir**.
- El PDF sale igual a tu planilla: logo de la empresa (tomado del Excel), encabezado, filas de facturas y total de kilos, firmas de Chofer, Facturación y Jefe de Depósito, y "DESPACHO NRO:". **Solo se dibujan las filas usadas**, sin cuadros vacíos de relleno.
- Al generar, se producen varios PDF de una vez:
  - Relación completa con todos los datos.
  - Relación completa **sin la columna de VENTA**.
  - Una relación individual por vendedor (con todos los datos).
  - Relaciones aparte para las facturas marcadas COCOLISO, VIVERES u OLEICA de cada vendedor (se detectan por esa palabra junto al nombre del vendedor).
- Lo seleccionado también se escribe en la hoja "RELACION DE DESPACHO CON TODOS" del archivo abierto, respetando su formato.

### 4. Novedades
- Se selecciona una factura registrada y se escribe a mano lo que pasó con ella; se guarda.
- Lista de facturas que tienen novedad, con buscador por cliente, vendedor o número de factura.

### 5. Facturas en carpeta
- Lista de facturas registradas donde se marca cuáles ya regresaron y están en carpeta, indicando si tienen novedad o no, con buscador.

### 6. Reportes de kilos
- Separado por vendedor, con total de kilos y ventas de cada uno.
- Dentro de cada vendedor, buscador por número de factura o cliente.
- COCOLISO / VIVERES / OLEICA se agrupan bajo el mismo vendedor pero se muestran identificadas aparte.

### 7. Estilo
Interfaz igual al estilo de la imagen que enviaste: barra lateral oscura con los módulos (Registrar, Pendientes, Novedades, Despacho, Reportes, Archivo), tarjetas blancas, acento azul, y los contadores de resumen abajo a la izquierda.

## Detalles técnicos

- Base: TanStack Start + React + Tailwind, empaquetado con Electron para correr local sin internet.
- Lectura y escritura del `.xlsx` con ExcelJS en el proceso de Electron: se abre el libro, se escriben solo las celdas de datos y se guarda sobre el mismo archivo, conservando estilos, imágenes y hojas.
- Mapeo de celdas confirmado leyendo tu archivo:
  - Hojas de día (LUNES–VIERNES): encabezados en fila 6 y datos desde la fila 7 — A=COD, B=CLIENTE, C=FECHA, D=ORDEN DE ENTREGA, E=KILOS, F=$$$ , G=LUGAR, H=VENDEDOR, I/J=MORTADELA 500/900.
  - "RELACION DE DESPACHO CON TODOS": A1 encabezado empresa, A3/C3 zona, F3/H3 fecha de despacho, A4/D4 chofer y ayudante, A5/D5 vehículo, fila 6 (500GR en E6, 900GR en H6), fila 7 (CARNE en E7, AHUMADA en H7), encabezados en fila 8 y filas de facturas desde la 9 (A=ITEM, B=CLIENTE, C=FECHA, D=FACTURA, E=KILOS, F=VENTA, G=ZONA, H=VENDEDOR).
- PDF generado con pdf-lib a partir del mismo mapeo, con el logo extraído de las imágenes incrustadas del libro.
- Estado por archivo: novedades, facturas en carpeta y selección de despacho se guardan en un archivo lateral junto al `.xlsx` abierto, así cada semana mantiene lo suyo y cambiar de archivo limpia la pantalla.

## Sobre Windows 7 de 32 bits

El ejecutable se compila para 32 bits con la última versión de Electron que todavía soporta Windows 7 (Electron 22, ia32). Se entrega como carpeta comprimida `.zip` con el `.exe` adentro: se descomprime y se ejecuta, sin instalador. No puedo probarlo en Windows 7 desde aquí, así que la verificación final queda de tu lado al abrirlo en la máquina.

## Orden de trabajo

1. Extraer el logo y confirmar el mapeo de celdas.
2. Interfaz con la barra lateral y los módulos.
3. Lectura y escritura del Excel abierto.
4. Registro de facturas + listas desplegables.
5. Despacho, generación de los PDF (completo, sin venta, por vendedor y por marca) e impresión.
6. Novedades y Facturas en carpeta, con buscadores.
7. Reportes de kilos por vendedor.
8. Empaquetado del ejecutable de 32 bits y entrega del `.zip`.
