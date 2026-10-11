import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { LOGO_PNG_BASE64 } from "@/assets/logo";
import { formatDate } from "./excel";
import { splitVendedor, type Invoice } from "./types";
import { agrupar, normalizar, type FilaProducto } from "./checklistStats";

const W = 612;
const H = 792;
const M = 28;
const black = rgb(0, 0, 0);
const gray = rgb(0.88, 0.88, 0.88);

function b64(b: string) {
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function fit(s: string, f: PDFFont, size: number, max: number) {
  let t = s;
  while (t.length > 0 && f.widthOfTextAtSize(t, size) > max) t = t.slice(0, -1);
  return t;
}

interface Col {
  label: string;
  w: number;
  right?: boolean;
}

class Doc {
  pdf!: PDFDocument;
  font!: PDFFont;
  bold!: PDFFont;
  page!: PDFPage;
  y = 0;
  logo: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  title = "";
  sub = "";

  static async create(title: string, sub: string) {
    const d = new Doc();
    d.pdf = await PDFDocument.create();
    d.font = await d.pdf.embedFont(StandardFonts.Helvetica);
    d.bold = await d.pdf.embedFont(StandardFonts.HelveticaBold);
    try {
      d.logo = await d.pdf.embedPng(b64(LOGO_PNG_BASE64));
    } catch {
      d.logo = null;
    }
    d.title = title;
    d.sub = sub;
    d.newPage();
    return d;
  }

  newPage() {
    this.page = this.pdf.addPage([W, H]);
    let y = H - M;
    if (this.logo) this.page.drawImage(this.logo, { x: M, y: y - 34, width: 44, height: 34 });
    this.page.drawText("INVERSIONES EL CIBAO", { x: M + 54, y: y - 14, size: 13, font: this.bold });
    this.page.drawText(this.title, { x: M + 54, y: y - 30, size: 11, font: this.bold });
    this.page.drawText(this.sub, { x: W - M - this.font.widthOfTextAtSize(this.sub, 9), y: y - 14, size: 9, font: this.font });
    y -= 48;
    this.y = y;
  }

  ensure(h: number) {
    if (this.y - h < M + 20) this.newPage();
  }

  heading(t: string) {
    this.ensure(40);
    this.y -= 6;
    this.page.drawText(t, { x: M, y: this.y - 11, size: 11, font: this.bold });
    this.y -= 18;
  }

  row(cols: Col[], vals: string[], opts: { head?: boolean; bold?: boolean } = {}) {
    const h = 15;
    this.ensure(h);
    let x = M;
    const f = opts.head || opts.bold ? this.bold : this.font;
    cols.forEach((c, i) => {
      this.page.drawRectangle({
        x,
        y: this.y - h,
        width: c.w,
        height: h,
        borderColor: black,
        borderWidth: 0.6,
        ...(opts.head ? { color: gray } : {}),
      });
      const t = fit(vals[i] ?? "", f, 8, c.w - 6);
      const tw = f.widthOfTextAtSize(t, 8);
      const tx = opts.head ? x + (c.w - tw) / 2 : c.right ? x + c.w - tw - 3 : x + 3;
      this.page.drawText(t, { x: tx, y: this.y - h + 4.5, size: 8, font: f });
      x += c.w;
    });
    this.y -= h;
  }

  async bytes() {
    return this.pdf.save();
  }
}

const n2 = (v: number) => v.toFixed(2);

/** Productos (de los checklist asociados) de las facturas del reporte, total y por zona. */
function seccionProductos(d: Doc, invoices: Invoice[], filas?: FilaProducto[]) {
  if (!filas) return;
  const nums = new Set(invoices.map((i) => (i.factura || "").trim()).filter(Boolean));
  const zonaDe = new Map(invoices.map((i) => [(i.factura || "").trim(), (i.lugar || "").trim().toUpperCase() || "SIN ZONA"]));
  const mias = filas.filter((r) => nums.has(r.factura.trim())).map((r) => ({ ...r, zona: zonaDe.get(r.factura.trim()) ?? r.zona }));
  const conCk = new Set(mias.map((r) => r.factura.trim()));
  const cols: Col[] = [{ label: "PRODUCTO", w: 340 }, { label: "KILOS", w: 120, right: true }, { label: "%", w: 96, right: true }];
  const tabla = (titulo: string, l: FilaProducto[]) => {
    d.heading(titulo);
    d.row(cols, cols.map((c) => c.label), { head: true });
    agrupar(l, "producto").forEach((g) => d.row(cols, [g.nombre, n2(g.kilos), `${g.pct.toFixed(1)}%`]));
    d.row(cols, ["TOTAL", n2(l.reduce((s, r) => s + r.kilos, 0)), "100%"], { bold: true });
  };
  if (mias.length === 0) { d.heading("PRODUCTOS VENDIDOS: ninguna factura tiene checklist asociado."); return; }
  tabla("PRODUCTOS VENDIDOS (CHECKLIST)", mias);
  const zonas = new Map<string, FilaProducto[]>();
  mias.forEach((r) => zonas.set(normalizar(r.zona), [...(zonas.get(normalizar(r.zona)) ?? []), r]));
  [...zonas.values()].sort((a, b) => b.reduce((s, r) => s + r.kilos, 0) - a.reduce((s, r) => s + r.kilos, 0))
    .forEach((l) => tabla(`PRODUCTOS · ZONA ${l[0].zona}`, l));
  const sin = nums.size - conCk.size;
  if (sin > 0) d.heading(`Nota: ${sin} factura(s) de este reporte no tienen checklist asociado.`);
}

const DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "DIARIO"];

/** Relación de ventas diarias: una sección por día (como las hojas de LUNES a VIERNES). */
export async function buildVentasDiariasPdf(invoices: Invoice[], semana: string, periodo?: string, filas?: FilaProducto[]) {
  const d = await Doc.create("RELACIÓN DE VENTAS DIARIAS", periodo ?? `Semana del ${formatDate(semana)}`);
  const cols: Col[] = [
    { label: "CLIENTE", w: 150 },
    { label: "FECHA", w: 52 },
    { label: "FACTURA", w: 56 },
    { label: "KILOS / CAJAS", w: 60, right: true },
    { label: "VENTA", w: 62, right: true },
    { label: "LUGAR", w: 80 },
    { label: "VENDEDOR", w: 96 },
  ];
  let gk = 0;
  let gv = 0;
  for (const dia of DIAS) {
    const list = invoices.filter((i) => i.sheet === dia);
    if (list.length === 0) continue;
    d.heading(dia === "DIARIO" ? "DIARIO (VÍVERES)" : dia);
    d.row(cols, cols.map((c) => c.label), { head: true });
    let k = 0;
    let v = 0;
    list.forEach((i) => {
      k += i.kilos || 0;
      v += i.venta || 0;
      d.row(cols, [
        i.cliente,
        formatDate(i.fecha),
        i.factura,
        i.diario ? `${i.cajas ?? 0} cj / ${i.und ?? 0} und` : n2(i.kilos),
        n2(i.venta),
        i.lugar,
        i.vendedor,
      ]);
    });
    d.row(cols, ["TOTAL", "", `${list.length} fact.`, n2(k), n2(v), "", ""], { bold: true });
    gk += k;
    gv += v;
  }
  if (invoices.length === 0) d.heading("No hay facturas registradas en esta semana.");
  else {
    d.heading("TOTAL DE LA SEMANA");
    const t: Col[] = [{ label: "", w: 258 }, { label: "", w: 60, right: true }, { label: "", w: 62, right: true }];
    d.row(t, [`${invoices.length} facturas`, n2(gk), n2(gv)], { bold: true });
  }
  seccionProductos(d, invoices, filas);
  return d.bytes();
}

/** Reporte de kilos y ventas agrupado por vendedor, con detalle por marca. */
export async function buildKilosVendedorPdf(invoices: Invoice[], semana: string, periodo?: string, filas?: FilaProducto[]) {
  const d = await Doc.create("REPORTE DE KILOS POR VENDEDOR", periodo ?? `Semana del ${formatDate(semana)}`);
  const map = new Map<string, Invoice[]>();
  invoices.forEach((i) => {
    const k = splitVendedor(i.vendedor).base || "SIN VENDEDOR";
    map.set(k, [...(map.get(k) ?? []), i]);
  });
  const resumen: Col[] = [
    { label: "VENDEDOR", w: 260 },
    { label: "FACTURAS", w: 70, right: true },
    { label: "KILOS", w: 113, right: true },
    { label: "VENTA", w: 113, right: true },
  ];
  d.heading("RESUMEN");
  d.row(resumen, resumen.map((c) => c.label), { head: true });
  const grupos = Array.from(map.entries()).sort(
    (a, b) => b[1].reduce((s, i) => s + i.kilos, 0) - a[1].reduce((s, i) => s + i.kilos, 0),
  );
  grupos.forEach(([v, list]) =>
    d.row(resumen, [
      v,
      String(list.length),
      n2(list.reduce((s, i) => s + i.kilos, 0)),
      n2(list.reduce((s, i) => s + i.venta, 0)),
    ]),
  );
  d.row(
    resumen,
    [
      "TOTAL",
      String(invoices.length),
      n2(invoices.reduce((s, i) => s + i.kilos, 0)),
      n2(invoices.reduce((s, i) => s + i.venta, 0)),
    ],
    { bold: true },
  );

  const det: Col[] = [
    { label: "FACTURA", w: 56 },
    { label: "CLIENTE", w: 150 },
    { label: "FECHA", w: 52 },
    { label: "LUGAR", w: 90 },
    { label: "TIPO", w: 60 },
    { label: "KILOS", w: 74, right: true },
    { label: "VENTA", w: 74, right: true },
  ];
  grupos.forEach(([v, list]) => {
    d.heading(v);
    d.row(det, det.map((c) => c.label), { head: true });
    list.forEach((i) =>
      d.row(det, [
        i.factura,
        i.cliente,
        formatDate(i.fecha),
        i.lugar,
        splitVendedor(i.vendedor).marca ?? "NORMAL",
        n2(i.kilos),
        n2(i.venta),
      ]),
    );
    d.row(
      det,
      ["TOTAL", "", "", "", "", n2(list.reduce((s, i) => s + i.kilos, 0)), n2(list.reduce((s, i) => s + i.venta, 0))],
      { bold: true },
    );
  });
  seccionProductos(d, invoices, filas);
  return d.bytes();
}

/** Reporte de un vendedor con sus facturas agrupadas por fecha (kilos o víveres). */
export async function buildVendedorPorFechaPdf(
  vendedor: string,
  invoices: Invoice[],
  periodo: string,
  tipo: "kilos" | "viveres",
  filas?: FilaProducto[],
) {
  const d = await Doc.create(tipo === "kilos" ? `REPORTE DE KILOS · ${vendedor}` : `REPORTE DE VÍVERES · ${vendedor}`, periodo);
  const cols: Col[] =
    tipo === "kilos"
      ? [
          { label: "FACTURA", w: 60 }, { label: "CLIENTE", w: 170 }, { label: "LUGAR", w: 96 }, { label: "TIPO", w: 60 },
          { label: "KILOS", w: 85, right: true }, { label: "VENTA", w: 85, right: true },
        ]
      : [
          { label: "FACTURA", w: 60 }, { label: "CLIENTE", w: 170 }, { label: "LUGAR", w: 96 }, { label: "CAJAS", w: 60, right: true },
          { label: "UND", w: 60, right: true }, { label: "VENTA", w: 110, right: true },
        ];
  const porFecha = new Map<string, Invoice[]>();
  [...invoices].sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach((i) => porFecha.set(i.fecha, [...(porFecha.get(i.fecha) ?? []), i]));
  const sum = (l: Invoice[], k: "kilos" | "venta" | "cajas" | "und") => l.reduce((s, i) => s + (Number(i[k]) || 0), 0);
  porFecha.forEach((list, fecha) => {
    d.heading(`FECHA: ${formatDate(fecha) || "SIN FECHA"}`);
    d.row(cols, cols.map((c) => c.label), { head: true });
    list.forEach((i) =>
      d.row(cols, tipo === "kilos"
        ? [i.factura, i.cliente, i.lugar, splitVendedor(i.vendedor).marca ?? "NORMAL", n2(i.kilos), n2(i.venta)]
        : [i.factura, i.cliente, i.lugar, String(i.cajas ?? 0), String(i.und ?? 0), n2(i.venta)]),
    );
    d.row(cols, tipo === "kilos"
      ? ["SUBTOTAL", `${list.length} fact.`, "", "", n2(sum(list, "kilos")), n2(sum(list, "venta"))]
      : ["SUBTOTAL", `${list.length} fact.`, "", String(sum(list, "cajas")), String(sum(list, "und")), n2(sum(list, "venta"))], { bold: true });
  });
  if (invoices.length === 0) d.heading("No hay facturas en este período.");
  else {
    d.heading("TOTAL DEL PERÍODO");
    d.row(cols, tipo === "kilos"
      ? ["TOTAL", `${invoices.length} fact.`, "", "", n2(sum(invoices, "kilos")), n2(sum(invoices, "venta"))]
      : ["TOTAL", `${invoices.length} fact.`, "", String(sum(invoices, "cajas")), String(sum(invoices, "und")), n2(sum(invoices, "venta"))], { bold: true });
  }
  seccionProductos(d, invoices, filas);
  return d.bytes();
}

/** Kilos vendidos por cada vendedor de cada producto (CheckList con kilos cargados). */
export async function buildProductosVendedorPdf(
  periodo: string,
  vendedores: { vendedor: string; kilos: number; productos: { nombre: string; kilos: number; pct: number }[] }[],
) {
  const d = await Doc.create("KILOS POR PRODUCTO Y VENDEDOR (CHECKLIST)", periodo);
  const cols: Col[] = [{ label: "PRODUCTO", w: 340 }, { label: "KILOS", w: 120, right: true }, { label: "%", w: 96, right: true }];
  vendedores.forEach((v) => {
    d.heading(`${v.vendedor} · ${n2(v.kilos)} kg`);
    d.row(cols, cols.map((c) => c.label), { head: true });
    v.productos.forEach((p) => d.row(cols, [p.nombre, n2(p.kilos), `${p.pct.toFixed(1)}%`]));
    d.row(cols, ["TOTAL", n2(v.kilos), "100%"], { bold: true });
  });
  if (vendedores.length === 0) d.heading("No hay checklist con kilos en este período.");
  return d.bytes();
}

export interface FilaLista extends Invoice {
  anulada?: boolean;
  notaCredito?: unknown;
  novedad?: string | null;
}

export const estadoFactura = (f: FilaLista) =>
  [f.anulada ? "ANULADA" : "", f.notaCredito ? "NOTA CRÉDITO" : "", f.novedad ? "NOVEDAD" : ""].filter(Boolean).join(" / ");

/** Lista de facturas filtrada (PDF). Los totales no cuentan anuladas. */
export async function buildListaFacturasPdf(rows: FilaLista[], periodo: string) {
  const d = await Doc.create("LISTA DE FACTURAS", periodo);
  const cols: Col[] = [
    { label: "CLIENTE", w: 120 }, { label: "FECHA", w: 48 }, { label: "FACTURA", w: 50 },
    { label: "KILOS / CAJAS", w: 62, right: true }, { label: "VENTA", w: 56, right: true },
    { label: "LUGAR", w: 70 }, { label: "VENDEDOR", w: 80 }, { label: "ESTADO", w: 70 },
  ];
  d.row(cols, cols.map((c) => c.label), { head: true });
  rows.forEach((i) =>
    d.row(cols, [
      i.cliente, formatDate(i.fecha), i.factura,
      i.diario ? `${i.cajas ?? 0} cj / ${i.und ?? 0} und` : n2(i.kilos),
      n2(i.venta), i.lugar, i.vendedor, estadoFactura(i),
    ]),
  );
  const act = rows.filter((r) => !r.anulada);
  d.row(cols, ["TOTAL", "", `${act.length} fact.`, n2(act.reduce((s, i) => s + (i.kilos || 0), 0)), n2(act.reduce((s, i) => s + (i.venta || 0), 0)), "", "", ""], { bold: true });
  if (rows.length === 0) d.heading("No hay facturas para esos filtros.");
  return d.bytes();
}
