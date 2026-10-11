import type { DespachoHeader, Invoice } from "./types";

export type Periodo = "hoy" | "semana" | "mes" | "anio" | "todo" | "rango";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Rango [desde, hasta] (yyyy-mm-dd, inclusivo) de un período relativo a `hoy`. */
export function rangoDe(periodo: Periodo, hoy = new Date(), desde = "", hasta = ""): { desde: string; hasta: string } {
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  switch (periodo) {
    case "hoy":
      return { desde: iso(d), hasta: iso(d) };
    case "semana": {
      const l = new Date(d);
      l.setDate(d.getDate() - 6);
      return { desde: iso(l), hasta: iso(d) };
    }
    case "mes":
      return { desde: iso(new Date(d.getFullYear(), d.getMonth(), 1)), hasta: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
    case "anio":
      return { desde: `${d.getFullYear()}-01-01`, hasta: `${d.getFullYear()}-12-31` };
    case "rango":
      return { desde, hasta };
    default:
      return { desde: "", hasta: "" };
  }
}

export const enRango = (fecha: string, r: { desde: string; hasta: string }) => {
  const f = (fecha || "").slice(0, 10);
  return (!r.desde || f >= r.desde) && (!r.hasta || f <= r.hasta);
};

const eq = (a: string, b: string) => !b || (a || "").toUpperCase().trim() === b.toUpperCase().trim();
const contiene = (a: string, b: string) => !b || (a || "").toUpperCase().includes(b.toUpperCase().trim());

export interface FiltroFacturas {
  rango: { desde: string; hasta: string };
  usuario?: string;
  vendedor?: string;
  cliente?: string;
}

export function filtrarFacturas<T extends Invoice & { creadoPor?: string }>(rows: T[], f: FiltroFacturas): T[] {
  return rows.filter(
    (r) =>
      enRango(r.fecha, f.rango) &&
      eq(r.creadoPor ?? "", f.usuario ?? "") &&
      eq(r.vendedor, f.vendedor ?? "") &&
      contiene(r.cliente, f.cliente ?? ""),
  );
}

export interface DespachoHecho {
  id: string;
  creado: string;
  creado_por: string;
  tipo: "pdf" | "excel";
  header: DespachoHeader;
  facturas: Invoice[];
}

export interface FiltroDespachos extends FiltroFacturas {
  zona?: string;
}

/** La fecha de una relación es la fecha del despacho (o la de creación si no tiene). */
export function filtrarDespachos(rows: DespachoHecho[], f: FiltroDespachos): DespachoHecho[] {
  return rows.filter(
    (d) =>
      enRango(d.header?.fecha || d.creado, f.rango) &&
      eq(d.creado_por, f.usuario ?? "") &&
      eq(d.header?.zona ?? "", f.zona ?? "") &&
      (!f.vendedor || d.facturas.some((i) => eq(i.vendedor, f.vendedor!))) &&
      (!f.cliente || d.facturas.some((i) => contiene(i.cliente, f.cliente!))),
  );
}

/** Filtra por zonas (lugar de la factura). Lista vacía = todas las zonas. */
export function filtrarPorZonas<T extends { lugar: string }>(rows: T[], zonas: string[]): T[] {
  if (zonas.length === 0) return rows;
  const set = new Set(zonas.map((z) => z.trim().toUpperCase()));
  return rows.filter((r) => set.has((r.lugar || "").trim().toUpperCase()));
}
