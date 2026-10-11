# Ajustar el PDF de facturas y el ícono del programa

## Resultado
- El PDF **Lista de facturas** mostrará todo el contenido centrado, tanto en los encabezados como en las filas.
- Los nombres largos de clientes, lugares y vendedores se mostrarán completos, distribuyéndose en dos líneas cuando sea necesario en lugar de cortarse.
- Se redistribuirá el ancho de las columnas para dar más espacio a **Cliente**, manteniendo una letra clara y legible.
- El estado **Nota de crédito** aparecerá abreviado como **N.C**. Los demás estados conservarán su significado.
- El logo de Inversiones El Cibao que ya aparece en el PDF se convertirá en el ícono del programa para Windows, visible en el ejecutable, la ventana y la barra de tareas.
- Se entregará un nuevo archivo `Cibao-win32-ia32.zip`, listo para descomprimir y ejecutar en Windows 7 de 32 bits.

## Comprobación
- Generar un PDF de prueba con nombres largos y combinaciones de estados.
- Renderizar y revisar visualmente el PDF para confirmar que ningún texto esté cortado, amontonado o ilegible.
- Verificar el programa, generar la versión de escritorio con Electron 22 compatible con Windows 7 y comprobar el contenido final del ZIP.

## Detalles técnicos
- La tabla del PDF usará altura de fila adaptable y ajuste de texto por palabras, limitado a un tamaño mínimo legible.
- El cambio de centrado y ajuste se aplicará únicamente al PDF de la lista de facturas, sin alterar los demás reportes.
- Se generará un archivo de ícono de varios tamaños desde el logo existente y se aplicará tanto a la ventana de Electron como al empaquetado de Windows x86.
