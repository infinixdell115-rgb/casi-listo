# Entrega del ZIP para Windows 7 de 32 bits

## Qué falta
El archivo `Cibao-win32-ia32.zip` que está en Files es de las 17:02, es decir, de antes del último cambio (la vista de un solo checklist vertical en Lista de facturas). Hay que volver a armarlo con el código actual.

## Pasos
1. Comprobar que el proyecto compila sin errores (revisión de tipos y de la última compilación).
2. Generar la versión de escritorio con el código actualizado.
3. Empaquetar el programa para Windows de 32 bits con la versión de Electron que todavía funciona en Windows 7.
4. Comprimir el resultado y reemplazar `Cibao-win32-ia32.zip` en Files, listo para descargar.
5. Confirmar el peso y el contenido del archivo entregado.

## Qué recibirá
Un único ZIP. Al descomprimirlo, se abre `Cibao.exe` sin instalación y sin internet; los datos siguen leyendo de la PC servidor de la oficina.

## Detalles técnicos
- Verificación previa: `npx tsgo --noEmit -p .` y lectura de `/tmp/observability/build-errors.log`.
- Compilación del renderizador: `npm run build:desktop`.
- Empaquetado: `npx @electron/packager . "Cibao" --platform=win32 --arch=ia32 --electron-version=22.3.27 --out=<carpeta temporal> --overwrite --ignore='node_modules' --ignore='^/src' --ignore='^/public' --ignore='^/desktop-dist'`.
- Compresión con `zip` (nixpkgs) a `/tmp` y copia a `/mnt/documents/Cibao-win32-ia32.zip`, reemplazando la versión anterior.
- Ningún cambio de código: solo compilación y empaquetado de lo ya existente.
