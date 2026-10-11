import type { Checklist, ChecklistDatos } from "./types";

export interface FilaProducto {
  fecha: string; // YYYY-MM-DD
  factura: string;
  cliente: string;
  vendedor: string;
  zona: string;
  producto: string;
  kilos: number;
  /** referencia al ítem original para editar/eliminar */
  checklistId?: string;
  lado?: 1 | 2;
  idx?: number;
}

export interface Grupo {
  nombre: string;
  kilos: number;
  veces: number;
  pct: number;
}

export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();

const titulo = (s: string) => s.trim().replace(/\s+/g, " ").toUpperCase();

const isoDia = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function filasDe(d: ChecklistDatos | undefined, fecha: string, vendedorPadre: string, checklistId = "", lado: 1 | 2 = 1): FilaProducto[] {
  if (!d) return [];
  const out: FilaProducto[] = [];
  (d.items ?? []).forEach((it, idx) => {
    const kilos = parseFloat(String(it.peso ?? "").replace(",", ".")) || 0;
    if (!it.descripcion?.trim() || kilos <= 0) return;
    out.push({
      fecha,
      factura: d.factura ?? "",
      cliente: titulo(d.cliente || "SIN CLIENTE"),
      vendedor: titulo(d.vendedor || vendedorPadre || "SIN VENDEDOR"),
      zona: titulo(d.direccion || "SIN ZONA"),
      producto: titulo(it.descripcion),
      kilos,
      checklistId,
      lado,
      idx,
    });
  });
  return out;
}

/** Solo checklist completados (con kilos de almacén) generan filas. */
export function aplanar(lista: Checklist[]): FilaProducto[] {
  return lista
    .filter((c) => (c.estado ?? "pendiente") === "completado")
    .flatMap((c) => {
      const f = isoDia(c.creado);
      return [...filasDe(c, f, c.vendedor, c.id, 1), ...filasDe(c.segundo, f, c.vendedor, c.id, 2)];
    });
}

/** Sustituye los kilos de cada producto por los recibidos cuando su factura tiene nota de crédito. */
export function aplicarNotas(filas: FilaProducto[], notas: Record<string, Record<string, number>>): FilaProducto[] {
  return filas.map((r) => {
    const m = notas[r.factura.trim()];
    const k = m?.[normalizar(r.producto)];
    return k == null ? r : { ...r, kilos: k };
  });
}

export function filtrar(filas: FilaProducto[], desde: string, hasta: string, vendedor: string, zona = "") {
  return filas.filter(
    (r) => (!desde || r.fecha >= desde) && (!hasta || r.fecha <= hasta) && (!vendedor || r.vendedor === vendedor) && (!zona || r.zona === zona),
  );
}

/** Agrupa por clave (nombre normalizado) y ordena de mayor a menor kilos. */
export function agrupar(filas: FilaProducto[], campo: "producto" | "cliente" | "vendedor" | "zona"): Grupo[] {
  const m = new Map<string, Grupo>();
  let total = 0;
  for (const r of filas) {
    const k = normalizar(r[campo]);
    const g = m.get(k) ?? { nombre: r[campo], kilos: 0, veces: 0, pct: 0 };
    g.kilos += r.kilos;
    g.veces += 1;
    m.set(k, g);
    total += r.kilos;
  }
  return [...m.values()]
    .map((g) => ({ ...g, pct: total ? (g.kilos / total) * 100 : 0 }))
    .sort((a, b) => b.kilos - a.kilos || a.nombre.localeCompare(b.nombre));
}
