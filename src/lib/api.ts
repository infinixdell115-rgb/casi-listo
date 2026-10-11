// Cliente del servidor local en red (PC servidor de la oficina).
export const MODULOS = [
  { id: "registrar", label: "Registrar" },
  { id: "pendientes", label: "Pendientes" },
  { id: "novedades", label: "Novedades" },
  { id: "despacho", label: "Despacho" },
  { id: "anulaciones", label: "Anulaciones" },
  { id: "carpeta", label: "Facturas en carpeta" },
  { id: "reportes", label: "Reportes" },
  { id: "checklist", label: "CheckList" },
  { id: "master", label: "Master de clientes" },
  { id: "lista", label: "Lista de facturas" },
  { id: "facturas_editar", label: "Editar facturas" },
  { id: "facturas_eliminar", label: "Eliminar facturas" },
  { id: "despachos_eliminar", label: "Eliminar relaciones de despacho" },
] as const;
export type ModuloId = (typeof MODULOS)[number]["id"];

export interface Usuario {
  id: string;
  usuario: string;
  esAdmin: boolean;
  modulos: ModuloId[];
  activo: boolean;
}

export interface RedConfig {
  modo: "servidor" | "cliente";
  servidor?: string;
}
export interface RedInfo {
  config: RedConfig | null;
  ips: string[];
  activo: boolean;
  error?: string;
}

const PORT = 4590;
const RED_KEY = "cibao-red";
const TOKEN_KEY = "cibao-token";

interface RedApi {
  redGet?: () => Promise<RedInfo>;
  redSet?: (cfg: RedConfig) => Promise<RedInfo>;
}
const desk = () => (typeof window !== "undefined" ? (window.cibao as unknown as RedApi | undefined) : undefined);

let cfgActual: RedConfig | null = null;

export async function getRed(): Promise<RedInfo> {
  const d = desk();
  let info: RedInfo;
  if (d?.redGet) info = await d.redGet();
  else {
    let config: RedConfig | null = null;
    try { config = JSON.parse(localStorage.getItem(RED_KEY) || "null") as RedConfig | null; } catch { /* */ }
    info = { config, ips: [], activo: false };
  }
  cfgActual = info.config;
  return info;
}

export async function setRed(cfg: RedConfig): Promise<RedInfo> {
  const d = desk();
  let info: RedInfo;
  if (d?.redSet) info = await d.redSet(cfg);
  else {
    localStorage.setItem(RED_KEY, JSON.stringify(cfg));
    info = { config: cfg, ips: [], activo: false };
  }
  cfgActual = info.config;
  return info;
}

export function baseUrl() {
  const c = cfgActual;
  if (!c || c.modo === "servidor") return `http://127.0.0.1:${PORT}`;
  const h = (c.servidor || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `http://${h.includes(":") ? h : `${h}:${PORT}`}`;
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

type Listener = () => void;
const onUnauthorized = new Set<Listener>();
export const subscribeUnauthorized = (fn: Listener) => {
  onUnauthorized.add(fn);
  return () => { onUnauthorized.delete(fn); };
};

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(baseUrl() + path, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
    });
  } catch {
    throw new ApiError("No hay conexión con la PC servidor. Revisa que esté encendida y con el programa abierto.", 0);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    if (res.status === 401 && path !== "/api/login") onUnauthorized.forEach((f) => f());
    throw new ApiError(data.error || "Error del servidor.", res.status);
  }
  return data as T;
}

export function escucharCambios(onChange: () => void) {
  const t = getToken();
  if (!t || typeof EventSource === "undefined") return () => {};
  const es = new EventSource(`${baseUrl()}/api/eventos?token=${encodeURIComponent(t)}`);
  es.onmessage = (e) => { if (e.data !== "hola") onChange(); };
  return () => es.close();
}
