// Servidor local en red: guarda todos los datos en un archivo en la PC servidor.
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const PORT = 4590;
const ADMIN = "ADMINISTRADOR";
const ADMIN_CLAVE = "123456";
const MODULOS = ["registrar", "pendientes", "novedades", "despacho", "anulaciones", "carpeta", "reportes", "checklist", "master", "lista", "facturas_editar", "facturas_eliminar", "novedades_editar"];

function startServer({ dataDir, backupDir }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "cibao-datos.json");
  let db = { usuarios: [], facturas: [], checklists: [], despachos: [], zonasForaneas: [], pendientes: [] };
  if (fs.existsSync(dbPath)) {
    try { db = { ...db, ...JSON.parse(fs.readFileSync(dbPath, "utf8")) }; } catch (e) { console.error(e); }
  }
  function hashInit(clave, sal = crypto.randomBytes(16).toString("hex")) {
    return sal + ":" + crypto.scryptSync(String(clave), sal, 64).toString("hex");
  }
  // Usuario maestro ya creado: Admin / Admin (solo si aún no hay administrador).
  if (!db.usuarios.some((u) => u.esAdmin)) {
    db.usuarios.push({ id: crypto.randomUUID(), usuario: ADMIN, hash: hashInit(ADMIN_CLAVE), esAdmin: true, modulos: MODULOS, activo: true });
    fs.writeFileSync(dbPath, JSON.stringify(db));
  }
  if (!db.adminMigrado2) {
    const a = db.usuarios.find((u) => u.esAdmin);
    if (a) { a.usuario = ADMIN; a.hash = hashInit(ADMIN_CLAVE); a.activo = true; }
    db.adminMigrado2 = true;
    fs.writeFileSync(dbPath, JSON.stringify(db));
  }
  function normFecha(v) {
    const t = String(v || "").trim();
    if (!t) return "";
    let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
    return t;
  }
  {
    let cambio = false;
    for (const col of ["facturas", "checklists", "pendientes", "despachos"]) for (const r of db[col] || []) {
      if (r && r.fecha) { const n = normFecha(r.fecha); if (n !== r.fecha) { r.fecha = n; cambio = true; } }
    }
    if (cambio) fs.writeFileSync(dbPath, JSON.stringify(db));
  }
  const sesiones = new Map(); // token -> userId
  const clientes = new Set();

  function guardar() {
    const tmp = dbPath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, dbPath);
    if (backupDir) {
      try {
        fs.mkdirSync(backupDir, { recursive: true });
        const d = new Date();
        const f = path.join(backupDir, `respaldo-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`);
        fs.copyFileSync(dbPath, f);
      } catch (e) { console.error(e); }
    }
  }
  function avisar(tipo) {
    for (const res of clientes) res.write(`data: ${tipo}\n\n`);
  }
  function hash(clave, sal = crypto.randomBytes(16).toString("hex")) {
    return sal + ":" + crypto.scryptSync(String(clave), sal, 64).toString("hex");
  }
  function verificar(clave, h) {
    const [sal, k] = String(h).split(":");
    const a = Buffer.from(k, "hex");
    const b = crypto.scryptSync(String(clave), sal, 64);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  const publico = (u) => ({ id: u.id, usuario: u.usuario, esAdmin: !!u.esAdmin, modulos: u.esAdmin ? MODULOS : u.modulos, activo: u.activo });
  const limpiaModulos = (m) => (Array.isArray(m) ? m.filter((x) => MODULOS.includes(x)) : []);

  function send(res, status, body) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    });
    res.end(body === undefined ? "" : JSON.stringify(body));
  }
  function leerBody(req) {
    return new Promise((resolve, reject) => {
      let s = "";
      req.on("data", (c) => { s += c; if (s.length > 20e6) req.destroy(); });
      req.on("end", () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(e); } });
      req.on("error", reject);
    });
  }
  function usuarioDe(req, url) {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : url.searchParams.get("token");
    const id = token && sesiones.get(token);
    const u = id && db.usuarios.find((x) => x.id === id && x.activo);
    return u || null;
  }
  // Aislamiento por usuario: el administrador ve todo; los demás solo lo que crearon.
  const esMio = (u, rec) => u.esAdmin || String(rec.creado_por || "").toUpperCase() === String(u.usuario).toUpperCase();
  const puede = (u, m) => u.esAdmin || (u.modulos || []).includes(m);
  // Orden por número correlativo de factura (numérico), luego por registro.
  const numFact = (f) => { const n = parseInt(String(f || "").replace(/\D/g, ""), 10); return isNaN(n) ? Infinity : n; };
  const porCorrelativo = (a, b) => numFact(a.factura) - numFact(b.factura) || String(a.factura).localeCompare(String(b.factura)) || String(a.created_at).localeCompare(String(b.created_at));

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") return send(res, 204);
      const url = new URL(req.url, "http://x");
      const p = url.pathname;

      if (p === "/api/estado") return send(res, 200, { configurado: db.usuarios.some((u) => u.esAdmin), admin: ADMIN });
      if (p === "/api/setup" && req.method === "POST") {
        if (db.usuarios.some((u) => u.esAdmin)) return send(res, 400, { error: "El administrador ya existe." });
        const b = await leerBody(req);
        if (String(b.clave || "").length < 4) return send(res, 400, { error: "La contraseña debe tener al menos 4 caracteres." });
        db.usuarios.push({ id: crypto.randomUUID(), usuario: ADMIN, hash: hash(b.clave), esAdmin: true, modulos: MODULOS, activo: true });
        guardar();
        return send(res, 200, { ok: true });
      }
      if (p === "/api/login" && req.method === "POST") {
        const b = await leerBody(req);
        const u = db.usuarios.find((x) => x.usuario.toUpperCase() === String(b.usuario || "").trim().toUpperCase());
        if (!u || !u.activo || !verificar(b.clave || "", u.hash)) return send(res, 401, { error: "Usuario o contraseña incorrectos." });
        const token = crypto.randomBytes(32).toString("hex");
        sesiones.set(token, u.id);
        return send(res, 200, { token, usuario: publico(u) });
      }

      const u = usuarioDe(req, url);
      if (!u) return send(res, 401, { error: "Sesión no válida. Entra de nuevo." });

      if (p === "/api/yo") return send(res, 200, publico(u));
      if (p === "/api/logout") {
        for (const [t, id] of sesiones) if (id === u.id && req.headers.authorization === `Bearer ${t}`) sesiones.delete(t);
        return send(res, 200, { ok: true });
      }
      if (p === "/api/eventos") {
        res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "Access-Control-Allow-Origin": "*" });
        res.write("data: hola\n\n");
        clientes.add(res);
        const ping = setInterval(() => res.write(": ping\n\n"), 25000);
        req.on("close", () => { clearInterval(ping); clientes.delete(res); });
        return;
      }

      // ---- Facturas
      if (p === "/api/facturas" && req.method === "GET") {
        const semana = url.searchParams.get("semana");
        const desde = normFecha(url.searchParams.get("desde"));
        const hasta = normFecha(url.searchParams.get("hasta"));
        const fs0 = url.searchParams.get("fechaSemana");
        let fs1 = "";
        if (fs0) { const d = new Date(fs0 + "T12:00:00"); d.setDate(d.getDate() + 6); fs1 = d.toISOString().slice(0, 10); }
        const enSemana = (f) => !fs0 || (f.fecha ? f.fecha >= fs0 && f.fecha <= fs1 : f.semana === fs0);
        const lista = db.facturas.filter((f) => enSemana(f) &&
          (!semana || f.semana === semana) &&
          (!desde || normFecha(f.fecha) >= desde) &&
          (!hasta || normFecha(f.fecha) <= hasta) &&
          esMio(u, f));
        lista.sort(porCorrelativo);
        return send(res, 200, lista);
      }
      if (p === "/api/facturas" && req.method === "POST") {
        if (!puede(u, "registrar")) return send(res, 403, { error: "No tienes permiso para registrar facturas." });
        const b = await leerBody(req);
        const now = new Date().toISOString();
        const nuevas = (Array.isArray(b) ? b : []).map((r, i) => ({
          id: crypto.randomUUID(), semana: String(r.semana), dia: String(r.dia), cliente: String(r.cliente || ""),
          fecha: normFecha(r.fecha), factura: String(r.factura || ""), kilos: Number(r.kilos) || 0, venta: Number(r.venta) || 0,
          lugar: String(r.lugar || ""), vendedor: String(r.vendedor || ""), cajas: r.cajas == null ? null : Number(r.cajas),
          und: r.und == null ? null : Number(r.und),
          m500: r.m500 == null ? null : Number(r.m500), m900: r.m900 == null ? null : Number(r.m900),
          m_ahumada: r.m_ahumada == null ? null : Number(r.m_ahumada), m_carne: r.m_carne == null ? null : Number(r.m_carne), diario: !!r.diario, novedad: null, novedad_fecha: null, en_carpeta: false,
          anulada: false, anulada_motivo: null, anulada_en: null, anulada_por: null, creado_por: u.usuario,
          created_at: new Date(Date.parse(now) + i).toISOString(),
        }));
        db.facturas.push(...nuevas);
        guardar(); avisar("facturas");
        return send(res, 200, nuevas);
      }
      let m = p.match(/^\/api\/facturas\/([\w-]+)$/);
      if (m && req.method === "PUT") {
        if (!puede(u, "facturas_editar")) return send(res, 403, { error: "No tienes permiso para editar facturas." });
        const f = db.facturas.find((x) => x.id === m[1]);
        if (!f) return send(res, 404, { error: "Factura no encontrada." });
        if (!esMio(u, f)) return send(res, 403, { error: "Esta factura no es tuya." });
        const b = await leerBody(req);
        const txt = ["cliente", "fecha", "factura", "lugar", "vendedor", "dia"];
        const num = ["kilos", "venta"];
        const opt = ["cajas", "und", "m500", "m900", "m_ahumada", "m_carne"];
        for (const k of txt) if (k in b) f[k] = String(b[k] ?? "");
        for (const k of num) if (k in b) f[k] = Number(b[k]) || 0;
        for (const k of opt) if (k in b) f[k] = b[k] == null || b[k] === "" ? null : Number(b[k]);
        if ("dia" in b) f.diario = f.dia === "DIARIO";
        f.editado_por = u.usuario; f.editado_en = new Date().toISOString();
        guardar(); avisar("facturas");
        return send(res, 200, f);
      }
      if (m && req.method === "DELETE") {
        if (!puede(u, "facturas_eliminar")) return send(res, 403, { error: "No tienes permiso para eliminar facturas." });
        const f = db.facturas.find((x) => x.id === m[1]);
        if (!f) return send(res, 404, { error: "Factura no encontrada." });
        if (!esMio(u, f)) return send(res, 403, { error: "Esta factura no es tuya." });
        db.facturas = db.facturas.filter((x) => x.id !== f.id);
        guardar(); avisar("facturas");
        return send(res, 200, { ok: true });
      }
      if (m && req.method === "PATCH") {
        const f = db.facturas.find((x) => x.id === m[1]);
        if (!f) return send(res, 404, { error: "Factura no encontrada." });
        if (!esMio(u, f)) return send(res, 403, { error: "Esta factura no es tuya." });
        const b = await leerBody(req);
        const permisos = { novedad: "novedades", novedad_fecha: "novedades", nota_credito: "novedades", en_carpeta: "carpeta", anulada: "anulaciones", anulada_motivo: "anulaciones" };
        const patch = {};
        for (const k of Object.keys(permisos)) {
          if (k in b) {
            if (!puede(u, permisos[k])) return send(res, 403, { error: "No tienes permiso para este cambio." });
            patch[k] = b[k];
          }
        }
        if (f.novedad && patch.novedad && !puede(u, "novedades_editar")) return send(res, 403, { error: "No tienes permiso para editar novedades." });
        if (patch.nota_credito) patch.nota_credito = { ...patch.nota_credito, por: u.usuario, fecha: new Date().toISOString() };
        if ("novedad" in patch && !patch.novedad) patch.nota_credito = null;
        if ("novedad" in patch) patch.novedad_por = patch.novedad ? u.usuario : null;
        if ("anulada" in patch) {
          patch.anulada = !!patch.anulada;
          patch.anulada_en = patch.anulada ? new Date().toISOString() : null;
          patch.anulada_por = patch.anulada ? u.usuario : null;
          if (!patch.anulada) patch.anulada_motivo = null;
        }
        Object.assign(f, patch);
        guardar(); avisar("facturas");
        return send(res, 200, f);
      }

      // ---- Master de clientes
      if (p === "/api/master" && req.method === "GET") {
        if (!puede(u, "master")) return send(res, 403, { error: "Sin permiso." });
        return send(res, 200, db.facturas.filter((f) => !f.anulada && esMio(u, f)));
      }
      if (p === "/api/zonas-foraneas" && req.method === "GET") {
        if (!puede(u, "master")) return send(res, 403, { error: "Sin permiso." });
        return send(res, 200, db.zonasForaneas || []);
      }
      if (p === "/api/zonas-foraneas" && req.method === "PUT") {
        if (!u.esAdmin) return send(res, 403, { error: "Solo el administrador puede cambiar las zonas foráneas." });
        const b = await leerBody(req);
        db.zonasForaneas = Array.from(new Set((Array.isArray(b.zonas) ? b.zonas : []).map((z) => String(z).trim().toUpperCase()).filter(Boolean)));
        guardar(); avisar("zonas");
        return send(res, 200, db.zonasForaneas);
      }

      // ---- Relaciones de despacho hechas
      if (p === "/api/despachos" && req.method === "GET") {
        if (!puede(u, "despacho")) return send(res, 403, { error: "Sin permiso." });
        return send(res, 200, db.despachos.filter((d) => esMio(u, d)).sort((a, b) => String(b.creado).localeCompare(String(a.creado))));
      }
      if (p === "/api/despachos" && req.method === "POST") {
        if (!puede(u, "despacho")) return send(res, 403, { error: "Sin permiso." });
        const b = await leerBody(req);
        const rec = { id: crypto.randomUUID(), creado: new Date().toISOString(), creado_por: u.usuario,
          tipo: b.tipo === "excel" ? "excel" : "pdf", header: b.header || {}, facturas: Array.isArray(b.facturas) ? b.facturas : [] };
        db.despachos.push(rec);
        guardar(); avisar("despachos");
        return send(res, 200, rec);
      }
      const md = p.match(/^\/api\/despachos\/([^/]+)$/);
      if (md && req.method === "DELETE") {
        if (!puede(u, "despachos_eliminar")) return send(res, 403, { error: "No tienes permiso para eliminar relaciones de despacho." });
        const d = db.despachos.find((x) => x.id === md[1]);
        if (!d) return send(res, 404, { error: "Relación no encontrada." });
        if (!esMio(u, d)) return send(res, 403, { error: "Esta relación no es tuya." });
        db.despachos = db.despachos.filter((x) => x.id !== d.id);
        guardar(); avisar("despachos");
        return send(res, 200, { ok: true });
      }
      if (p === "/api/notas-credito" && req.method === "GET") {
        return send(res, 200, db.facturas.filter((f) => f.nota_credito && !f.anulada && esMio(u, f)).map((f) => ({ factura: f.factura, notaCredito: f.nota_credito })));
      }
      // ---- Respaldo manual (solo administrador)
      if (p === "/api/respaldo" && req.method === "POST") {
        if (!u.esAdmin) return send(res, 403, { error: "Solo el administrador." });
        if (!backupDir) return send(res, 400, { error: "No hay carpeta de respaldo." });
        fs.mkdirSync(backupDir, { recursive: true });
        const d = new Date(); const z = (n) => String(n).padStart(2, "0");
        const f = path.join(backupDir, `respaldo-${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}-${z(d.getSeconds())}.json`);
        fs.writeFileSync(f, JSON.stringify(db));
        return send(res, 200, { ruta: f });
      }
      // ---- Supervisión (solo administrador): facturas de cualquier semana
      if (p === "/api/supervision/facturas" && req.method === "GET") {
        if (!u.esAdmin) return send(res, 403, { error: "Solo el administrador." });
        return send(res, 200, db.facturas.slice().sort(porCorrelativo));
      }

      // ---- Checklists
      if (p === "/api/checklists" && req.method === "GET") {
        if (!puede(u, "checklist")) return send(res, 403, { error: "Sin permiso." });
        return send(res, 200, db.checklists.filter((c) => esMio(u, c)).sort((a, b) => String(b.creado).localeCompare(String(a.creado))));
      }
      m = p.match(/^\/api\/checklists\/([\w-]+)$/);
      if (m && req.method === "PUT") {
        if (!puede(u, "checklist")) return send(res, 403, { error: "Sin permiso." });
        const b = await leerBody(req);
        const prev = db.checklists.find((x) => x.id === m[1]);
        if (prev && !esMio(u, prev)) return send(res, 403, { error: "Este checklist no es tuyo." });
        const rec = { id: m[1], datos: b.datos, creado: b.creado || new Date().toISOString(), creado_por: prev ? prev.creado_por : u.usuario };
        db.checklists = db.checklists.filter((x) => x.id !== m[1]);
        db.checklists.push(rec);
        guardar();
        return send(res, 200, rec);
      }
      if (m && req.method === "DELETE") {
        if (!puede(u, "checklist")) return send(res, 403, { error: "Sin permiso." });
        const prev = db.checklists.find((x) => x.id === m[1]);
        if (!prev) return send(res, 404, { error: "Checklist no encontrado." });
        if (!esMio(u, prev)) return send(res, 403, { error: "Este checklist no es tuyo." });
        db.checklists = db.checklists.filter((x) => x.id !== m[1]);
        guardar();
        return send(res, 200, { ok: true });
      }

      // ---- Clientes pendientes por mercancía
      if (p === "/api/pendientes" && req.method === "GET") {
        if (!puede(u, "pendientes")) return send(res, 403, { error: "Sin permiso." });
        return send(res, 200, (db.pendientes || []).filter((x) => esMio(u, x)).sort((a, b) => String(b.creado).localeCompare(String(a.creado))));
      }
      const limpiaPend = (b) => ({
        cliente: String(b.cliente || "").trim().toUpperCase(), zona: String(b.zona || "").trim().toUpperCase(),
        vendedor: String(b.vendedor || "").trim().toUpperCase(), nota: String(b.nota || ""), resuelto: !!b.resuelto,
        productos: (Array.isArray(b.productos) ? b.productos : []).map((x) => ({ producto: String(x.producto || "").trim().toUpperCase(), cantidad: String(x.cantidad || "").trim() })).filter((x) => x.producto),
      });
      if (p === "/api/pendientes" && req.method === "POST") {
        if (!puede(u, "pendientes")) return send(res, 403, { error: "Sin permiso." });
        const b = await leerBody(req);
        const rec = { id: crypto.randomUUID(), creado: new Date().toISOString(), creado_por: u.usuario, ...limpiaPend(b) };
        if (!rec.cliente) return send(res, 400, { error: "Escribe el cliente." });
        db.pendientes = [...(db.pendientes || []), rec];
        guardar(); avisar("pendientes");
        return send(res, 200, rec);
      }
      m = p.match(/^\/api\/pendientes\/([\w-]+)$/);
      if (m) {
        if (!puede(u, "pendientes")) return send(res, 403, { error: "Sin permiso." });
        const prev = (db.pendientes || []).find((x) => x.id === m[1]);
        if (!prev) return send(res, 404, { error: "Pendiente no encontrado." });
        if (!esMio(u, prev)) return send(res, 403, { error: "Este pendiente no es tuyo." });
        if (req.method === "PUT") {
          Object.assign(prev, limpiaPend(await leerBody(req)));
          guardar(); avisar("pendientes");
          return send(res, 200, prev);
        }
        if (req.method === "DELETE") {
          db.pendientes = db.pendientes.filter((x) => x.id !== prev.id);
          guardar(); avisar("pendientes");
          return send(res, 200, { ok: true });
        }
      }

      // ---- Usuarios (solo administrador)
      if (p.startsWith("/api/usuarios")) {
        if (!u.esAdmin) return send(res, 403, { error: "Solo el administrador puede gestionar usuarios." });
        if (p === "/api/usuarios" && req.method === "GET") return send(res, 200, db.usuarios.map(publico));
        if (p === "/api/usuarios" && req.method === "POST") {
          const b = await leerBody(req);
          const nombre = String(b.usuario || "").trim();
          if (!/^[\w.\-]{3,30}$/.test(nombre)) return send(res, 400, { error: "El usuario debe tener de 3 a 30 letras o números, sin espacios." });
          if (db.usuarios.some((x) => x.usuario.toUpperCase() === nombre.toUpperCase())) return send(res, 400, { error: "Ese usuario ya existe." });
          if (String(b.clave || "").length < 4) return send(res, 400, { error: "La contraseña debe tener al menos 4 caracteres." });
          const nu = { id: crypto.randomUUID(), usuario: nombre, hash: hash(b.clave), esAdmin: false, modulos: limpiaModulos(b.modulos), activo: true };
          db.usuarios.push(nu); guardar();
          return send(res, 200, publico(nu));
        }
        m = p.match(/^\/api\/usuarios\/([\w-]+)$/);
        const t = m && db.usuarios.find((x) => x.id === m[1]);
        if (!t) return send(res, 404, { error: "Usuario no encontrado." });
        if (req.method === "PATCH") {
          const b = await leerBody(req);
          if (b.clave !== undefined) {
            if (String(b.clave).length < 4) return send(res, 400, { error: "La contraseña debe tener al menos 4 caracteres." });
            t.hash = hash(b.clave);
            for (const [tok, id] of sesiones) if (id === t.id && t.id !== u.id) sesiones.delete(tok);
          }
          if (!t.esAdmin) {
            if (b.modulos !== undefined) t.modulos = limpiaModulos(b.modulos);
            if (b.activo !== undefined) {
              t.activo = !!b.activo;
              if (!t.activo) for (const [tok, id] of sesiones) if (id === t.id) sesiones.delete(tok);
            }
          }
          guardar(); avisar("usuarios");
          return send(res, 200, publico(t));
        }
        if (req.method === "DELETE") {
          if (t.esAdmin) return send(res, 400, { error: "No se puede eliminar al administrador." });
          db.usuarios = db.usuarios.filter((x) => x.id !== t.id);
          for (const [tok, id] of sesiones) if (id === t.id) sesiones.delete(tok);
          guardar();
          return send(res, 200, { ok: true });
        }
      }
      return send(res, 404, { error: "No encontrado." });
    } catch (e) {
      console.error(e);
      return send(res, 500, { error: "Error en el servidor." });
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "0.0.0.0", () => resolve({ port: PORT, ips: direccionesLocales(), close: () => server.close() }));
  });
}

function direccionesLocales() {
  const out = [];
  const ifs = os.networkInterfaces();
  for (const k of Object.keys(ifs)) for (const i of ifs[k] || []) if (i.family === "IPv4" && !i.internal) out.push(i.address);
  return out;
}

module.exports = { startServer, PORT };

if (require.main === module) {
  startServer({ dataDir: process.argv[2] || path.join(os.tmpdir(), "cibao-server") }).then((s) => console.log("Servidor en puerto", s.port, s.ips));
}
