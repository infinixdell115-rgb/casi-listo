# Entregar el código fuente completo del proyecto

## Qué se entrega

Un archivo **`Cibao-codigo-fuente.zip`** en la carpeta de archivos (Files), con todo el código fuente del proyecto tal como está hoy, listo para abrir en cualquier editor y ejecutar con `npm install` / `npm run dev`.

## Qué va dentro

```text
Cibao-codigo-fuente/
├── src/                  → 96 archivos: módulos de la app (facturas, novedades,
│                            reportes, checklists, despachos, usuarios...),
│                            librerías PDF/Excel, rutas, estilos, integraciones
├── electron/             → main.cjs, server.cjs, preload.cjs, renderer/,
│                            icon.png e icon.ico (ícono del logo Cibao)
├── drizzle/              → schema.ts y migraciones
├── supabase/             → config.toml
├── public/               → favicon.ico, robots.txt
├── package.json          → dependencias y scripts (dev, build, build:desktop)
├── package-lock.json     → versiones exactas para instalar igual que aquí
├── bun.lock, bunfig.toml → alternativa con bun
├── vite.config.ts        → configuración web
├── electron/vite.desktop.config.ts
├── tsconfig.json, eslint.config.js, .prettierrc, .prettierignore
├── components.json, drizzle.config.ts
├── .env                  → URL y clave publicable del backend (no hay claves privadas)
├── README.md, AGENTS.md, roadmap.md
```

## Qué se excluye (y por qué)

- `node_modules/` (682 MB) — se vuelve a crear con `npm install`.
- `desktop-dist/` y `electron-release/` (200 MB) — resultado de compilar, no código.
- `.git`, `.workspace` — control de versiones y estado del editor.
- `.lovable/` — metadatos internos de esta plataforma, no son parte del programa.
- `tsconfig.tsbuildinfo` y archivos de registro — temporales de compilación.

## Pasos

1. Armar una carpeta limpia en `/tmp/Cibao-codigo-fuente` copiando solo lo listado arriba.
2. Listar el contenido (incluidos archivos ocultos) y comprobar tamaño y conteo de archivos.
3. Comprimir con `zip` y verificar integridad con `unzip -t`.
4. Copiar el ZIP a Files y entregarlo como adjunto.

## Detalles técnicos

- Copia con `rsync -a` con exclusiones explícitas; sin dependencias ni salida de build, el ZIP queda en torno a 1 MB.
- `.env` solo contiene `SUPABASE_URL`, `SUPABASE_PROJECT_ID` y `SUPABASE_PUBLISHABLE_KEY` (claves publicables); no se incluye ninguna clave privada ni la contraseña de la base de datos.
- El ZIP se genera en `/tmp` y solo se copia a `/mnt/documents` tras pasar la prueba de integridad.
