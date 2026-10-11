const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");

let win = null;

const ROOT = path.join(__dirname, "..", "desktop-dist");

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    title: "Facturación y Despacho - Inversiones El Cibao",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(ROOT, "index.html"));
}

const { startServer } = require("./server.cjs");
let servidor = null;
function redPath() { return path.join(app.getPath("userData"), "red.json"); }
function leerRed() {
  try { return JSON.parse(fs.readFileSync(redPath(), "utf8")); } catch { return null; }
}
async function iniciarServidorSiToca() {
  const cfg = leerRed();
  if (cfg && cfg.modo === "servidor" && !servidor) {
    const dataDir = path.join(os.homedir(), "BASE DE DATOS CIBAO");
    fs.mkdirSync(dataDir, { recursive: true });
    const nuevo = path.join(dataDir, "cibao-datos.json");
    const viejo = path.join(app.getPath("userData"), "datos", "cibao-datos.json");
    if (!fs.existsSync(nuevo) && fs.existsSync(viejo)) {
      try { fs.copyFileSync(viejo, nuevo); } catch (e) { console.error(e); }
    }
    if (process.platform === "win32") {
      try { require("child_process").execFile("attrib", ["+h", dataDir], () => {}); } catch (e) { console.error(e); }
    }
    servidor = await startServer({
      dataDir,
      backupDir: path.join(os.homedir(), "RESPALDO CIBAO"),
    });
  }
}
ipcMain.handle("red-get", async () => {
  return { config: leerRed(), ips: servidor ? servidor.ips : [], activo: !!servidor };
});
ipcMain.handle("red-set", async (_e, cfg) => {
  fs.writeFileSync(redPath(), JSON.stringify(cfg));
  try { await iniciarServidorSiToca(); } catch (e) { return { error: String(e && e.message || e) }; }
  return { config: cfg, ips: servidor ? servidor.ips : [], activo: !!servidor };
});

app.whenReady().then(async () => {
  try { await iniciarServidorSiToca(); } catch (e) { console.error(e); }
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function sidecarPath(xlsxPath) {
  return xlsxPath.replace(/\.xlsx$/i, "") + ".datos.json";
}

ipcMain.handle("open-excel", async () => {
  const res = await dialog.showOpenDialog(win, {
    title: "Abrir archivo de Excel",
    filters: [{ name: "Excel", extensions: ["xlsx"] }],
    properties: ["openFile"],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const filePath = res.filePaths[0];
  const data = fs.readFileSync(filePath);
  return { path: filePath, name: path.basename(filePath), data: Array.from(data) };
});

ipcMain.handle("save-excel", async (_e, filePath, data) => {
  fs.writeFileSync(filePath, Buffer.from(data));
  return true;
});

ipcMain.handle("read-sidecar", async (_e, filePath) => {
  const p = sidecarPath(filePath);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
});

ipcMain.handle("write-sidecar", async (_e, filePath, json) => {
  fs.writeFileSync(sidecarPath(filePath), json, "utf8");
  return true;
});

function datedDespachoDir() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const dir = path.join(
    app.getPath("documents"),
    "Relaciones de despacho",
    `${day}-${month}-${year}`,
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

ipcMain.handle("save-pdf-batch", async (_e, files) => {
  const dir = datedDespachoDir();
  files.forEach((f) => {
    fs.writeFileSync(path.join(dir, path.basename(f.name)), Buffer.from(f.data));
  });
  return dir;
});

ipcMain.handle("save-despacho-excel", async (_e, name, data) => {
  const dir = datedDespachoDir();
  const parsed = path.parse(path.basename(name));
  let filePath = path.join(dir, `${parsed.name}${parsed.ext}`);
  let copy = 2;
  while (fs.existsSync(filePath)) {
    filePath = path.join(dir, `${parsed.name}_${copy++}${parsed.ext}`);
  }
  fs.writeFileSync(filePath, Buffer.from(data));
  return filePath;
});

ipcMain.handle("save-pdf", async (_e, name, data) => {
  const res = await dialog.showSaveDialog(win, { defaultPath: name });
  if (res.canceled || !res.filePath) return null;
  fs.writeFileSync(res.filePath, Buffer.from(data));
  return res.filePath;
});

function checklistRoot() {
  const dir = path.join(app.getPath("documents"), "CheckList creados");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readRegistro() {
  const p = path.join(checklistRoot(), "registro.json");
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return []; }
}

ipcMain.handle("checklist-list", async () => readRegistro());

ipcMain.handle("checklist-save", async (_e, record, name, data) => {
  const d = new Date(record.creado);
  const folder = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  const dir = path.join(checklistRoot(), folder);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, path.basename(name));
  fs.writeFileSync(filePath, Buffer.from(data));
  const list = readRegistro().filter((r) => r.id !== record.id);
  list.unshift(record);
  fs.writeFileSync(path.join(checklistRoot(), "registro.json"), JSON.stringify(list, null, 2), "utf8");
  return filePath;
});


function reportesRoot() {
  const dir = path.join(app.getPath("documents"), "REPORTES DE KILOS, LIMPIEZA Y VIVERES");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
ipcMain.handle("reporte-save", async (_e, name, data) => {
  const now = new Date();
  const dir = path.join(reportesRoot(), `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
  fs.mkdirSync(dir, { recursive: true });
  const parsed = path.parse(path.basename(name));
  let fp = path.join(dir, parsed.name + parsed.ext);
  if (fs.existsSync(fp)) {
    const h = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    fp = path.join(dir, `${parsed.name}_${h}${parsed.ext}`);
  }
  fs.writeFileSync(fp, Buffer.from(data));
  return fp;
});
ipcMain.handle("reportes-list", async () => {
  const root = reportesRoot();
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({
      carpeta: d.name,
      archivos: fs.readdirSync(path.join(root, d.name)).filter((f) => f.toLowerCase().endsWith(".pdf")).sort(),
    }))
    .sort((a, b) => b.carpeta.localeCompare(a.carpeta));
});
function reporteSeguro(carpeta, archivo) {
  const root = reportesRoot();
  const fp = path.resolve(root, path.basename(carpeta), path.basename(archivo || ""));
  if (!fp.startsWith(path.resolve(root))) throw new Error("ruta inválida");
  return fp;
}
ipcMain.handle("reporte-read", async (_e, carpeta, archivo) => Array.from(fs.readFileSync(reporteSeguro(carpeta, archivo))));
ipcMain.handle("reporte-open-folder", async (_e, carpeta) => {
  const { shell } = require("electron");
  await shell.openPath(carpeta ? reporteSeguro(carpeta, "") : reportesRoot());
  return true;
});

ipcMain.handle("print-pdf", async (_e, data, landscape) => {
  const tmp = path.join(os.tmpdir(), `despacho-${Date.now()}.pdf`);
  fs.writeFileSync(tmp, Buffer.from(data));
  const printWin = new BrowserWindow({ show: false });
  await printWin.loadURL("file://" + tmp.replace(/\\/g, "/"));
  printWin.webContents.print({
    silent: false,
    printBackground: true,
    landscape: !!landscape,
  }, () => {
    printWin.close();
    fs.unlink(tmp, () => {});
  });
  return true;
});
