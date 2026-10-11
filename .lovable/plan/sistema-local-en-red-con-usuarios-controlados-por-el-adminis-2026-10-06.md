# Sistema local en red con usuarios controlados por el administrador

## Lo que vas a tener
- **Una PC servidor** en la oficina guarda todos los datos. Las demás PC se conectan a ella por la red local (cable o wifi), **sin internet**.
- El mismo programa sirve para las dos cosas: al abrirlo por primera vez eliges "Esta PC es el servidor" o "Conectarme al servidor" (escribes la dirección de la PC servidor, que el programa te muestra).
- **Nada de correos**: se entra con usuario y contraseña.
- **FREDDER** es el administrador. La primera vez que se abre el servidor, eliges su contraseña.
- Nadie puede crearse una cuenta. Solo FREDDER, desde un módulo nuevo **"Usuarios"**:
  - crea usuarios (nombre de usuario y contraseña),
  - marca qué módulos puede usar cada uno (Registrar, Pendientes, Novedades, Despacho, Anulaciones, Facturas en carpeta, Reportes, CheckList),
  - cambia contraseñas, desactiva o elimina usuarios.
- Cada usuario solo ve en el menú los módulos que tiene permitidos.
- Los 3 cuadros de abajo del menú (Registros pendientes, Total kilos, Total ventas) **solo los ve el administrador**.
- Los PDF, la impresión y las carpetas en Documentos siguen igual en cada PC.

## Importante
- La PC servidor tiene que estar encendida y con el programa abierto para que las demás trabajen.
- Los datos guardados hasta ahora en línea no se pasan al sistema nuevo (empieza vacío).
- Se recomienda una copia de seguridad: el servidor guarda una copia diaria del archivo de datos en Documentos.

## Detalles técnicos
- Servidor HTTP embebido en el proceso principal de Electron (Node `http`, puerto 4590) con API REST + eventos SSE para que las demás PC vean cambios al instante.
- Base de datos: SQLite vía `sql.js` (WASM, sin binarios nativos, funciona en Win7 32 bits), persistida en `userData/cibao.db`, con copia diaria en `Documentos/Respaldo Cibao/`.
- Tablas: `usuarios` (usuario, hash scrypt, es_admin, modulos JSON, activo), `facturas`, `checklists` (mismas columnas que ahora).
- Sesiones con token aleatorio; cada endpoint valida token y permiso del módulo en el servidor, no solo en la pantalla. Gestión de usuarios solo para admin.
- `src/lib/store.tsx` pasa de Lovable Cloud a un cliente de la API local; la pantalla de configuración guarda la dirección del servidor en la PC.
- La vista previa en navegador queda solo para pruebas; el uso real es el ejecutable.
- Entrega: nuevo ZIP Windows 7 32 bits (v13).
