# Nuevo módulo "CheckList"

## Qué verás
Un botón nuevo **CHECKLIST** en el menú de la izquierda, con dos partes:

### 1. Crear checklist
- Formulario con: Jefe de depósito, Vendedor, Dirección, Cliente, N° de factura y Fecha (día / mes / año, con la fecha de hoy ya puesta).
- Opcional: elegir una factura ya registrada del Excel para llenar solo cliente, vendedor, dirección (lugar), número de factura y fecha.
- Tabla del pedido con 8 renglones: **CANT** y **DESCRIPCIÓN DEL PEDIDO**. La columna **PESO** se imprime vacía para llenarla a lápiz.
- Botones: **Vista previa**, **Guardar** e **Imprimir**.

### 2. Checklist guardados
- Lista de todos los checklist creados (fecha, cliente, vendedor, factura).
- Filtros por **fecha**, **cliente** y **vendedor**.
- Al elegir uno: **Vista previa**, **Guardar de nuevo** e **Imprimir**.

## Cómo sale impreso
Igual al PDF que enviaste: hoja carta horizontal y el checklist ocupa la mitad izquierda, con dos copias iguales una encima de la otra (bordes, títulos en negrita, cuadros DÍA/MES/AÑO). Los datos se imprimen dentro de sus casillas y PESO queda en blanco.

## Dónde se guardan
- Cada checklist se guarda como PDF en **Documentos / CheckList creados / DD-MM-AAAA /** (la fecha en que se creó), con un nombre como `Checklist_Factura-25001_Cliente.pdf`.
- El registro de checklist se guarda en **Documentos / CheckList creados / registro.json**, así la lista sigue ahí aunque cambies de archivo de Excel o cierres el programa.

## Entrega
Recompilar y entregar una nueva versión para Windows 7 de 32 bits (v9).

## Detalles técnicos
- `src/lib/types.ts`: tipo `Checklist { id, creado, jefe, vendedor, direccion, cliente, factura, dia, mes, anio, items: {cant, descripcion}[] }`.
- `src/lib/checklistPdf.ts`: `buildChecklistPdf(c)` con pdf-lib, página 792×612, bloque en x 0–396, dos copias apiladas; PESO siempre vacío.
- `electron/main.cjs` + `preload.cjs`: handlers `checklist-list`, `checklist-save` (escribe PDF en `CheckList creados/DD-MM-AAAA` y actualiza `registro.json`). `src/lib/desktop.ts`: wrappers; en navegador se usa localStorage + descarga.
- `src/components/app/Checklist.tsx`: formulario, lista filtrable, modal de vista previa (iframe del PDF); reutiliza `printPdf` (impresión en horizontal para este documento).
- `App.tsx`: entrada de menú "CheckList" (icono ClipboardList).
- Verificar el PDF visualmente contra el de ejemplo y reempaquetar con el mismo proceso de Electron 22 ia32.
