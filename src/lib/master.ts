export interface FilaMaster {
  cliente: string;
  lugar: string;
  fecha: string;
  kilos: number;
  cajas?: number | null;
  und?: number | null;
  diario?: boolean;
  en_carpeta?: boolean;
  anulada?: boolean;
}

/** Semana 1..5 del mes: semana 1 = día 1 hasta el primer domingo; luego lunes a domingo. Una 6ª se suma a la 5. */
export function semanaDelMes(fecha: string): number {
  const [y = 0, m = 1, d = 1] = fecha.slice(0, 10).split("-").map(Number);
  const dow1 = (new Date(y, m - 1, 1).getDay() + 6) % 7; // 0 = lunes
  return Math.min(5, Math.floor((d - 1 + dow1) / 7) + 1);
}

export const normalizar = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

export const esForanea = (lugar: string, lista: string[]) => {
  const l = normalizar(lugar);
  return !!l && lista.some((z) => normalizar(z) === l);
};

export interface Tot { kilos: number[]; cajas: number; und: number }
const nuevoTot = (): Tot => ({ kilos: [0, 0, 0, 0, 0], cajas: 0, und: 0 });

export interface ClienteMaster { cliente: string; lugar: string; foranea: boolean; semanas: number[]; total: number }

/** mes = "yyyy-mm". Solo cuenta facturas en carpeta y no anuladas; los clientes sin compra en el mes aparecen en 0. */
export function agruparMaster(rows: FilaMaster[], foraneas: string[], mes: string) {
  const clientes = new Map<string, ClienteMaster>();
  const local = nuevoTot();
  const foranea = nuevoTot();
  for (const r of rows) {
    if (r.anulada) continue;
    const key = normalizar(r.cliente);
    if (!key) continue;
    const esF = esForanea(r.lugar, foraneas);
    let c = clientes.get(key);
    if (!c) {
      c = { cliente: r.cliente.trim().toUpperCase(), lugar: (r.lugar || "").trim().toUpperCase(), foranea: esF, semanas: [0, 0, 0, 0, 0], total: 0 };
      clientes.set(key, c);
    }
    if (!r.en_carpeta || (r.fecha || "").slice(0, 7) !== mes) continue;
    const w = semanaDelMes(r.fecha) - 1;
    const k = Number(r.kilos) || 0;
    c.semanas[w] = (c.semanas[w] ?? 0) + k;
    c.total += k;
    const t = esF ? foranea : local;
    t.kilos[w] = (t.kilos[w] ?? 0) + k;
    if (r.diario) { t.cajas += Number(r.cajas) || 0; t.und += Number(r.und) || 0; }
  }
  return {
    clientes: [...clientes.values()].sort((a, b) => a.cliente.localeCompare(b.cliente)),
    local,
    foranea,
  };
}
