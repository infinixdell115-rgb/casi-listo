import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { LOGO_PNG_BASE64 } from "@/assets/logo";
import { formatDate } from "./excel";
import { isViveres, headerParaFacturas, type DespachoHeader, type Invoice } from "./types";

const GREY = rgb(0.65, 0.65, 0.65);
const LIGHT = rgb(0.85, 0.85, 0.85);
const BLUE = rgb(0.68, 0.82, 0.94);
const BLACK = rgb(0, 0, 0);
const DARKRED = rgb(0.6, 0.15, 0.1);

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

interface Ctx {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
}

function box(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  fill?: ReturnType<typeof rgb>,
) {
  ctx.page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    ...(fill ? { color: fill } : {}),
    borderColor: BLACK,
    borderWidth: 0.7,
  });
}

function text(
  ctx: Ctx,
  value: string,
  x: number,
  y: number,
  size: number,
  bold = false,
  color = BLACK,
) {
  ctx.page.drawText(value, { x, y, size, font: bold ? ctx.bold : ctx.font, color });
}

function centered(
  ctx: Ctx,
  value: string,
  x: number,
  w: number,
  y: number,
  size: number,
  bold = false,
  color = BLACK,
) {
  const f = bold ? ctx.bold : ctx.font;
  let s = size;
  let width = f.widthOfTextAtSize(value, s);
  while (width > w - 4 && s > 5) {
    s -= 0.5;
    width = f.widthOfTextAtSize(value, s);
  }
  text(ctx, value, x + (w - width) / 2, y, s, bold, color);
}

function left(
  ctx: Ctx,
  value: string,
  x: number,
  w: number,
  y: number,
  size: number,
  bold = false,
) {
  const f = bold ? ctx.bold : ctx.font;
  let s = size;
  while (f.widthOfTextAtSize(value, s) > w - 6 && s > 5) s -= 0.5;
  text(ctx, value, x + 3, y, s, bold);
}

export interface PdfOptions {
  hideVenta?: boolean;
  titulo?: string;
}

export async function buildDespachoPdf(
  header: DespachoHeader,
  invoices: Invoice[],
  options: PdfOptions = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(b64ToBytes(LOGO_PNG_BASE64));

  const pageW = 612;
  const pageH = 792;
  const page = doc.addPage([pageW, pageH]);
  const ctx: Ctx = { page, font, bold };

  const M = 22;
  const W = pageW - M * 2;
  let y = pageH - M;

  const hideVenta = !!options.hideVenta;
  // column widths (proportional to the Excel layout)
  const baseCols = hideVenta
    ? [0.05, 0.33, 0.1, 0.09, 0.09, 0.18, 0.16]
    : [0.045, 0.28, 0.09, 0.08, 0.08, 0.09, 0.17, 0.155];
  const headers = hideVenta
    ? ["ITEM", "CLIENTE", "FECHA", "FACTURA", "KILOS", "ZONA", "VENDEDOR"]
    : ["ITEM", "CLIENTE", "FECHA", "FACTURA", "KILOS", "VENTA", "ZONA", "VENDEDOR"];
  const colW = baseCols.map((c) => c * W);
  const colX: number[] = [];
  let acc = M;
  colW.forEach((w) => {
    colX.push(acc);
    acc += w;
  });

  // ---- title band
  const titleH = 36;
  y -= titleH;
  box(ctx, M, y, W, titleH, BLUE);
  centered(ctx, "INVERSIONES EL CIBAO, C.A.", M, W, y + titleH - 13, 11, true);
  centered(ctx, "J-40406894-5", M, W, y + titleH - 25, 9.5, true);
  page.drawImage(logo, { x: M + 58, y: y + 3, width: 38, height: 30 });

  // ---- zona / fecha
  const rowH = 18;
  y -= rowH;
  const c1 = W * 0.34;
  const c2 = W * 0.26;
  const c3 = W * 0.2;
  const c4 = W - c1 - c2 - c3;
  box(ctx, M, y, c1, rowH, GREY);
  centered(ctx, "ZONA DE DESPACHO", M, c1, y + 5.5, 10.5, true);
  box(ctx, M + c1, y, c2, rowH);
  centered(ctx, header.zona.toUpperCase(), M + c1, c2, y + 5.5, 10, true);
  box(ctx, M + c1 + c2, y, c3, rowH, GREY);
  centered(ctx, "FECHA DE DESPACHO", M + c1 + c2, c3, y + 5.5, 8, true);
  box(ctx, M + c1 + c2 + c3, y, c4, rowH);
  centered(ctx, formatDate(header.fecha), M + c1 + c2 + c3, c4, y + 5.5, 10.5, true);

  // ---- chofer
  y -= rowH;
  box(ctx, M, y, c1, rowH, GREY);
  centered(ctx, "CHOFER Y AYUDANTE:", M, c1, y + 5.5, 10.5, true);
  box(ctx, M + c1, y, W * 0.1, rowH, GREY);
  box(ctx, M + c1 + W * 0.1, y, W - c1 - W * 0.1, rowH);
  centered(
    ctx,
    header.chofer.toUpperCase(),
    M + c1 + W * 0.1,
    W - c1 - W * 0.1,
    y + 5.5,
    10,
    true,
  );

  // ---- vehiculo
  y -= rowH;
  box(ctx, M, y, c1, rowH, GREY);
  centered(ctx, "VEHICULO ASIGNADO", M, c1, y + 5.5, 10.5, true);
  box(ctx, M + c1, y, W * 0.1, rowH, GREY);
  box(ctx, M + c1 + W * 0.1, y, W - c1 - W * 0.1, rowH);
  centered(
    ctx,
    header.vehiculo.toUpperCase(),
    M + c1 + W * 0.1,
    W - c1 - W * 0.1,
    y + 5.5,
    10,
    true,
  );

  // ---- mortadelas rows
  const mortRow = (labelA: string, valA: string, labelB: string, valB: string) => {
    const mortH = 15;
    y -= mortH;
    const a = W * 0.34;
    const b = W * 0.1;
    const c = W * 0.11;
    const d = W * 0.1;
    const e = W * 0.18;
    const f = W - a - b - c - d - e;
    box(ctx, M + a, y, b, mortH, GREY);
    box(ctx, M + a + b, y, c, mortH);
    centered(ctx, labelA, M + a + b, c, y + 4.5, 8.5, true);
    box(ctx, M + a + b + c, y, d, mortH);
    centered(ctx, valA.toUpperCase(), M + a + b + c, d, y + 4.5, 8.5, true);
    box(ctx, M + a + b + c + d, y, e, mortH, LIGHT);
    centered(ctx, labelB, M + a + b + c + d, e, y + 4.5, 8.5, true);
    box(ctx, M + a + b + c + d + e, y, f, mortH);
    centered(ctx, valB.toUpperCase(), M + a + b + c + d + e, f, y + 4.5, 8.5, true);
  };
  mortRow("500GR:", header.g500, "900GR:", header.g900);
  mortRow("CARNE", header.carne, "AHUMADA", header.ahumada);
  // Una sola celda (alto de las dos filas) con el título
  box(ctx, M, y, W * 0.34, 30, GREY);
  centered(ctx, "MORTADELAS A DESPACHAR", M, W * 0.34, y + 12, 8.5, true);

  // ---- table head
  const headH = 15;
  y -= headH;
  headers.forEach((h, i) => {
    box(ctx, colX[i]!, y, colW[i]!, headH, GREY);
    centered(ctx, h, colX[i]!, colW[i]!, y + 4.5, 7.5, true);
  });

  // ---- rows: shrink so everything (rows + totals + signatures) fits one page
  const SIG_BLOCK = 92;
  const available = y - M - SIG_BLOCK;
  const nRows = invoices.length + 1; // + totals row
  const bodyH = Math.max(4.8, Math.min(13, available / Math.max(nRows, 1)));
  const fSize = Math.max(4.4, Math.min(8, bodyH * 0.72));

  let totalKilos = 0;
  let totalVenta = 0;
  invoices.forEach((inv, i) => {
    y -= bodyH;
    totalKilos += inv.kilos || 0;
    totalVenta += inv.venta || 0;
    const values = hideVenta
      ? [
          String(i + 1),
          inv.cliente,
          formatDate(inv.fecha),
          inv.factura,
          inv.kilos ? inv.kilos.toFixed(2).replace(".", ",") : "",
          inv.lugar,
          inv.vendedor,
        ]
      : [
          String(i + 1),
          inv.cliente,
          formatDate(inv.fecha),
          inv.factura,
          inv.kilos ? inv.kilos.toFixed(2).replace(".", ",") : "",
          inv.venta ? inv.venta.toFixed(2).replace(".", ",") : "",
          inv.lugar,
          inv.vendedor,
        ];
    values.forEach((v, c) => {
      box(ctx, colX[c]!, y, colW[c]!, bodyH);
      if (c === 1) left(ctx, v, colX[c]!, colW[c]!, y + bodyH * 0.3, fSize);
      else centered(ctx, v, colX[c]!, colW[c]!, y + bodyH * 0.3, fSize);
    });
  });

  // ---- totals under KILOS (and VENTA when visible)
  y -= bodyH;
  const kIdx = 4;
  box(ctx, colX[kIdx]!, y, colW[kIdx]!, bodyH, GREY);
  centered(
    ctx,
    totalKilos.toFixed(2).replace(".", ","),
    colX[kIdx]!,
    colW[kIdx]!,
    y + bodyH * 0.3,
    fSize,
    true,
  );
  if (!hideVenta) {
    const vIdx = 5;
    box(ctx, colX[vIdx]!, y, colW[vIdx]!, bodyH, GREY);
    centered(
      ctx,
      totalVenta.toFixed(2).replace(".", ","),
      colX[vIdx]!,
      colW[vIdx]!,
      y + bodyH * 0.3,
      fSize,
      true,
    );
  }

  // ---- signatures (anchored near the bottom of the page)
  const sigW = W * 0.34;
  const sigL = M + W * 0.08;
  const sigR = M + W * 0.55;
  let sy = M + 62;
  [sigL, sigR].forEach((x) => {
    page.drawLine({
      start: { x: x + 20, y: sy + 16 },
      end: { x: x + sigW - 20, y: sy + 16 },
      thickness: 0.8,
      color: BLACK,
    });
  });
  centered(ctx, "CHOFER", sigL, sigW, sy + 4, 9, true);
  centered(ctx, "FACTURACION", sigR, sigW, sy + 4, 9, true);
  centered(
    ctx,
    "RECIBI CONFORME LAS FACTURAS Y MERCANCIA",
    sigL,
    sigW,
    sy - 8,
    8,
    false,
    DARKRED,
  );
  centered(
    ctx,
    "RECIBI CONFORME Y EN ORDEN LAS FACTURAS",
    sigR,
    sigW,
    sy - 8,
    8,
    false,
    DARKRED,
  );

  sy -= 38;
  const midX = M + W * 0.33;
  page.drawLine({
    start: { x: midX + 20, y: sy + 16 },
    end: { x: midX + sigW - 20, y: sy + 16 },
    thickness: 0.8,
    color: BLACK,
  });
  centered(ctx, "JEFE DEPOSITO", midX, sigW, sy + 4, 9, true);
  centered(
    ctx,
    "RECIBI CONFORME CESTAS Y NOVEDADES",
    midX,
    sigW,
    sy - 8,
    8,
    false,
    DARKRED,
  );

  // ---- despacho nro
  const bottomY = M + 6;
  text(ctx, "DESPACHO NRO:", M + W * 0.62, bottomY, 9, true);
  text(ctx, "____________", M + W * 0.62 + 78, bottomY, 9);

  return doc.save();
}

function safeName(s: string) {
  return s.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_").toUpperCase();
}

export interface GeneratedPdf {
  name: string;
  label: string;
  data: Uint8Array;
}

/** Full relation + full relation without VENTA + one per vendedor/marca. */
export async function buildAllDespachoPdfs(
  header: DespachoHeader,
  allInvoices: Invoice[],
): Promise<GeneratedPdf[]> {
  const out: GeneratedPdf[] = [];
  const fecha = header.fecha || "";
  const viveres = allInvoices.filter((i) => isViveres(i.vendedor));
  const invoices = allInvoices.filter((i) => !isViveres(i.vendedor));
  if (viveres.length) {
    out.push({
      name: `GUIA_DESPACHO_VIVERES_${fecha}.pdf`,
      label: "Guía de despacho de víveres",
      data: await buildGuiaViveresPdf(header, viveres),
    });
    const vg = new Map<string, Invoice[]>();
    viveres.forEach((i) => {
      const k = (i.vendedor || "").toUpperCase().trim();
      vg.set(k, [...(vg.get(k) ?? []), i]);
    });
    if (vg.size > 1)
      for (const [k, list] of vg)
        out.push({ name: `GUIA_${safeName(k)}_${fecha}.pdf`, label: `Guía de ${k}`, data: await buildGuiaViveresPdf(header, list) });
  }
  if (!invoices.length) return out;
  out.push({
    name: `RELACION_DESPACHO_COMPLETA_${fecha}.pdf`,
    label: "Relación completa (con venta)",
    data: await buildDespachoPdf(header, invoices),
  });
  out.push({
    name: `RELACION_DESPACHO_SIN_VENTA_${fecha}.pdf`,
    label: "Relación completa (sin venta)",
    data: await buildDespachoPdf(header, invoices, { hideVenta: true }),
  });

  const groups = new Map<string, Invoice[]>();
  invoices.forEach((inv) => {
    const key = (inv.vendedor || "SIN VENDEDOR").toUpperCase().trim();
    const arr = groups.get(key) ?? [];
    arr.push(inv);
    groups.set(key, arr);
  });
  for (const [key, list] of groups) {
    out.push({
      name: `DESPACHO_${safeName(key)}_${fecha}.pdf`,
      label: `Relación de ${key}`,
      data: await buildDespachoPdf(headerParaFacturas(header, list), list),
    });
  }
  return out;
}

const num = (n?: number) => (n ? String(Math.round(n * 100) / 100).replace(".", ",") : "");

/** Guía de despacho de víveres (formato de la hoja GUIA DE DESPACHO), vertical carta. */
export async function buildGuiaViveresPdf(header: DespachoHeader, invoices: Invoice[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(b64ToBytes(LOGO_PNG_BASE64));
  const pageW = 612;
  const pageH = 792;
  const page = doc.addPage([pageW, pageH]);
  const ctx: Ctx = { page, font, bold };
  const M = 22;
  const W = pageW - M * 2;
  let y = pageH - M;

  const titleH = 36;
  y -= titleH;
  box(ctx, M, y, W, titleH, BLUE);
  centered(ctx, "INVERSIONES EL CIBAO, C.A.", M, W, y + titleH - 13, 11, true);
  centered(ctx, "J-40406894-5", M, W, y + titleH - 25, 9.5, true);
  page.drawImage(logo, { x: M + 58, y: y + 3, width: 38, height: 30 });

  const rowH = 17;
  const lab = W * 0.26;
  // zona / fecha
  y -= rowH;
  const c2 = W * 0.34;
  const c3 = W * 0.2;
  box(ctx, M, y, lab, rowH, GREY);
  centered(ctx, "ZONA DE DESPACHO", M, lab, y + 5, 10, true);
  box(ctx, M + lab, y, c2, rowH);
  centered(ctx, header.zona.toUpperCase(), M + lab, c2, y + 5, 10, true);
  box(ctx, M + lab + c2, y, c3, rowH, GREY);
  centered(ctx, "FECHA DE DESPACHO", M + lab + c2, c3, y + 5, 8, true);
  box(ctx, M + lab + c2 + c3, y, W - lab - c2 - c3, rowH);
  centered(ctx, formatDate(header.fecha), M + lab + c2 + c3, W - lab - c2 - c3, y + 5, 10, true);

  const line = (label: string, value: string) => {
    y -= rowH;
    box(ctx, M, y, lab, rowH, GREY);
    centered(ctx, label, M, lab, y + 5, 10, true);
    box(ctx, M + lab, y, W - lab, rowH);
    centered(ctx, value.toUpperCase(), M + lab, W - lab, y + 5, 10, true);
  };
  line("CHOFER", header.chofer);
  line("AYUDANTE", header.ayudante ?? "");
  line("VEHICULO ASIGNADO", header.vehiculo);

  // salida de cajas
  y -= rowH;
  const cajasTot = invoices.reduce((a, b) => a + (b.cajas || 0), 0);
  const undTot = invoices.reduce((a, b) => a + (b.und || 0), 0);
  const ventaTot = invoices.reduce((a, b) => a + (b.venta || 0), 0);
  const parts: [string, number, boolean][] = [
    ["SALIDA DE CAJAS", lab, true],
    ["CAJAS TOTALES", W * 0.22, true],
    [String(cajasTot), W * 0.12, false],
    ["TOTAL FACTURAS", W * 0.22, true],
    [String(invoices.length), W - lab - W * 0.56, false],
  ];
  let x = M;
  parts.forEach(([t, w, g]) => {
    box(ctx, x, y, w, rowH, g ? GREY : undefined);
    centered(ctx, t, x, w, y + 5, 9.5, true);
    x += w;
  });

  const cols = [0.05, 0.31, 0.09, 0.08, 0.07, 0.09, 0.14, 0.17].map((c) => c * W);
  const colX: number[] = [];
  let acc = M;
  cols.forEach((w) => {
    colX.push(acc);
    acc += w;
  });
  const headH = 15;
  y -= headH;
  ["ITEM", "CLIENTE", "FACTURA", "N. CAJAS", "UND", "VENTA", "ZONA", "VENDEDOR"].forEach((h, i) => {
    box(ctx, colX[i]!, y, cols[i]!, headH, GREY);
    centered(ctx, h, colX[i]!, cols[i]!, y + 4.5, 7.5, true);
  });

  const SIG_BLOCK = 92;
  const available = y - M - SIG_BLOCK;
  const bodyH = Math.max(4.8, Math.min(14, available / Math.max(invoices.length + 1, 1)));
  const fSize = Math.max(4.4, Math.min(8.5, bodyH * 0.72));
  invoices.forEach((inv, i) => {
    y -= bodyH;
    [String(i + 1), inv.cliente, inv.factura, num(inv.cajas), num(inv.und), inv.venta ? inv.venta.toFixed(2).replace(".", ",") : "", inv.lugar, inv.vendedor].forEach((v, c) => {
      box(ctx, colX[c]!, y, cols[c]!, bodyH);
      if (c === 1) left(ctx, v, colX[c]!, cols[c]!, y + bodyH * 0.3, fSize);
      else centered(ctx, v, colX[c]!, cols[c]!, y + bodyH * 0.3, fSize);
    });
  });
  y -= bodyH;
  ([[3, String(cajasTot)], [4, String(undTot)], [5, ventaTot.toFixed(2).replace(".", ",")]] as [number, string][]).forEach(([c, v]) => {
    box(ctx, colX[c]!, y, cols[c]!, bodyH, GREY);
    centered(ctx, v, colX[c]!, cols[c]!, y + bodyH * 0.3, fSize, true);
  });

  const sigW = W * 0.34;
  const sigL = M + W * 0.08;
  const sigR = M + W * 0.55;
  let sy = M + 62;
  [sigL, sigR].forEach((sx) =>
    page.drawLine({ start: { x: sx + 20, y: sy + 16 }, end: { x: sx + sigW - 20, y: sy + 16 }, thickness: 0.8, color: BLACK }),
  );
  centered(ctx, "CHOFER", sigL, sigW, sy + 4, 9, true);
  centered(ctx, "FACTURACION", sigR, sigW, sy + 4, 9, true);
  centered(ctx, "RECIBI CONFORME LAS FACTURAS Y MERCANCIA", sigL, sigW, sy - 8, 8, false, DARKRED);
  centered(ctx, "RECIBI CONFORME Y EN ORDEN LAS FACTURAS", sigR, sigW, sy - 8, 8, false, DARKRED);
  sy -= 38;
  const midX = M + W * 0.33;
  page.drawLine({ start: { x: midX + 20, y: sy + 16 }, end: { x: midX + sigW - 20, y: sy + 16 }, thickness: 0.8, color: BLACK });
  centered(ctx, "JEFE DEPOSITO", midX, sigW, sy + 4, 9, true);
  centered(ctx, "RECIBI CONFORME CESTAS Y NOVEDADES", midX, sigW, sy - 8, 8, false, DARKRED);
  text(ctx, "DESPACHO NRO:", M + W * 0.62, M + 6, 9, true);
  text(ctx, "____________", M + W * 0.62 + 78, M + 6, 9);
  return doc.save();
}

/** Vista previa / impresión: planilla normal y, si hay víveres, la guía en otra página. */
export async function buildPreviewPdf(header: DespachoHeader, rows: Invoice[]): Promise<Uint8Array> {
  const viveres = rows.filter((i) => isViveres(i.vendedor));
  const normales = rows.filter((i) => !isViveres(i.vendedor));
  const parts: Uint8Array[] = [];
  if (normales.length) parts.push(await buildDespachoPdf(header, normales));
  if (viveres.length) parts.push(await buildGuiaViveresPdf(header, viveres));
  if (parts.length === 1) return parts[0]!;
  const out = await PDFDocument.create();
  for (const bytes of parts) {
    const src = await PDFDocument.load(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}
