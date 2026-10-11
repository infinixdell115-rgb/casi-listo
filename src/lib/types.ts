export type DaySheet = "LUNES" | "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES";

export const DAY_SHEETS: DaySheet[] = [
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
];

export const DESPACHO_SHEET = "RELACION DE DESPACHO CON TODOS";
export const DIARIO_SHEET = "DIARIO";
export const GUIA_SHEET = "GUIA DE DESPACHO";

/** Factura de víveres: el vendedor termina en "VIVERES". */
export function isViveres(vendedor: string) {
  return /VIVERES\s*\)?\s*$/i.test((vendedor || "").trim());
}

export interface Invoice {
  /** stable key: sheet + row */
  id: string;
  sheet: string;
  row: number;
  cliente: string;
  fecha: string; // yyyy-mm-dd
  factura: string; // orden de entrega
  kilos: number;
  venta: number;
  lugar: string;
  vendedor: string;
  /** solo facturas de la hoja DIARIO (víveres) */
  cajas?: number;
  und?: number;
  diario?: boolean;
  /** mortadelas vendidas en esta factura (unidades) */
  m500?: number;
  m900?: number;
  mAhumada?: number;
  mCarne?: number;
}

export const MORT_KEYS = ["m500", "m900", "mCarne", "mAhumada"] as const;

/** Suma las mortadelas de las facturas; null si ninguna factura las tiene anotadas. */
export function sumarMortadelas(rows: Invoice[]) {
  if (!rows.some((r) => MORT_KEYS.some((k) => r[k] != null))) return null;
  const t = (k: (typeof MORT_KEYS)[number]) => {
    const v = rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    return v ? String(Math.round(v * 100) / 100) : "";
  };
  return { g500: t("m500"), g900: t("m900"), carne: t("mCarne"), ahumada: t("mAhumada") };
}

/** Header con las mortadelas calculadas solo de estas facturas (si las tienen). */
export function headerParaFacturas<H extends { g500: string; g900: string; carne: string; ahumada: string }>(
  header: H,
  rows: Invoice[],
): H {
  const m = sumarMortadelas(rows);
  return m ? { ...header, ...m } : header;
}

export interface PendingInvoice {
  id: string;
  sheet: DaySheet | "DIARIO";
  cajas?: number;
  und?: number;
  cliente: string;
  fecha: string;
  factura: string;
  kilos: number;
  venta: number;
  lugar: string;
  vendedor: string;
  m500?: number;
  m900?: number;
  mAhumada?: number;
  mCarne?: number;
}

export interface Novedad {
  factura: string;
  cliente: string;
  vendedor: string;
  texto: string;
  fecha: string; // registro
}

export interface DespachoHeader {
  zona: string;
  fecha: string;
  chofer: string;
  ayudante?: string;
  vendedorTlf?: string;
  vehiculo: string;
  g500: string;
  g900: string;
  carne: string;
  ahumada: string;
}

export interface SidecarData {
  novedades: Record<string, Novedad>;
  enCarpeta: string[];
  despacho: {
    header: DespachoHeader;
    seleccionadas: string[];
  };
}

export const emptySidecar = (): SidecarData => ({
  novedades: {},
  enCarpeta: [],
  despacho: {
    header: {
      zona: "",
      fecha: "",
      chofer: "",
      vehiculo: "",
      g500: "",
      g900: "",
      carne: "",
      ahumada: "",
    },
    seleccionadas: [],
  },
});

export const MARCAS = ["COCOLISO", "VIVERES", "OLEICA"] as const;
export type Marca = (typeof MARCAS)[number];

export function splitVendedor(nombre: string): { base: string; marca: Marca | null } {
  const upper = (nombre || "").toUpperCase().trim();
  for (const m of MARCAS) {
    if (upper.includes(m)) {
      const base = upper
        .replace(new RegExp(`\\(?\\s*${m}\\s*\\)?`, "g"), "")
        .replace(/\s+/g, " ")
        .trim();
      return { base, marca: m };
    }
  }
  return { base: upper, marca: null };
}

export interface ChecklistItem {
  cant: string;
  descripcion: string;
  /** kilos anotados por almacén (se llenan después de imprimir) */
  peso?: string;
}

export interface Checklist extends ChecklistDatos {
  id: string;
  creado: string; // ISO
  /** pendiente hasta que se anotan los kilos que regresó almacén */
  estado?: "pendiente" | "completado";
  completadoEn?: string;
  /** segundo checklist de la misma hoja */
  segundo?: ChecklistDatos;
}

export interface ChecklistDatos {
  jefe: string;
  vendedor: string;
  direccion: string;
  cliente: string;
  factura: string;
  dia: string;
  mes: string;
  anio: string;
  items: ChecklistItem[];
}
