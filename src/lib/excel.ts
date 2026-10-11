import ExcelJS from "exceljs";
import { LOGO_PNG_BASE64 } from "@/assets/logo";
import {
  headerParaFacturas,
  DAY_SHEETS,
  DESPACHO_SHEET,
  DIARIO_SHEET,
  GUIA_SHEET,
  isViveres,
  type DespachoHeader,
  type Invoice,
  type PendingInvoice,
} from "./types";

const FIRST_DATA_ROW = 7;

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return toISO(v);
  if (typeof v === "object") {
    const o = v as { result?: unknown; text?: unknown; richText?: { text: string }[] };
    if (Array.isArray(o.richText)) return o.richText.map((r) => r.text).join("").trim();
    if (o.text !== undefined) return String(o.text).trim();
    if (o.result !== undefined) return String(o.result).trim();
  }
  return "";
}

function cellNumber(v: ExcelJS.CellValue): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object") {
    const o = v as { result?: unknown };
    if (typeof o.result === "number") return o.result;
  }
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fromISO(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatDate(iso: string): string {
  const d = fromISO(iso);
  if (!d) return iso || "";
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function cellDate(v: ExcelJS.CellValue): string {
  if (v instanceof Date) return toISO(v);
  if (v && typeof v === "object") {
    const o = v as { result?: unknown };
    if (o.result instanceof Date) return toISO(o.result as Date);
  }
  if (typeof v === "string") {
    const m = v.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  }
  return "";
}

export async function loadWorkbook(data: Uint8Array): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  return wb;
}

export function readInvoices(wb: ExcelJS.Workbook): Invoice[] {
  const out: Invoice[] = [];
  for (const name of DAY_SHEETS) {
    const ws = wb.getWorksheet(name);
    if (!ws) continue;
    for (let r = FIRST_DATA_ROW; r <= Math.max(ws.rowCount, FIRST_DATA_ROW); r++) {
      const row = ws.getRow(r);
      const cliente = cellText(row.getCell(2).value);
      const factura = cellText(row.getCell(4).value);
      if (!cliente && !factura) continue;
      out.push({
        id: `${name}!${r}`,
        sheet: name,
        row: r,
        cliente,
        fecha: cellDate(row.getCell(3).value),
        factura,
        kilos: cellNumber(row.getCell(5).value),
        venta: cellNumber(row.getCell(6).value),
        lugar: cellText(row.getCell(7).value),
        vendedor: cellText(row.getCell(8).value),
      });
    }
  }
  const diario = wb.getWorksheet(DIARIO_SHEET);
  if (diario) {
    for (let r = DIARIO_FIRST_ROW; r <= Math.max(diario.rowCount, DIARIO_FIRST_ROW); r++) {
      const row = diario.getRow(r);
      const cliente = cellText(row.getCell(2).value);
      const factura = cellText(row.getCell(3).value);
      if (!cliente && !factura) continue;
      out.push({
        id: `${DIARIO_SHEET}!${r}`,
        sheet: DIARIO_SHEET,
        row: r,
        cliente,
        fecha: "",
        factura,
        kilos: 0,
        cajas: cellNumber(row.getCell(4).value),
        und: cellNumber(row.getCell(5).value),
        venta: cellNumber(row.getCell(6).value),
        lugar: cellText(row.getCell(7).value),
        vendedor: cellText(row.getCell(8).value),
        diario: true,
      });
    }
  }
  return out;
}

const DIARIO_FIRST_ROW = 6;

function appendDiario(ws: ExcelJS.Worksheet, items: PendingInvoice[]) {
  let last = DIARIO_FIRST_ROW - 1;
  let lastItem = 0;
  for (let r = DIARIO_FIRST_ROW; r <= Math.max(ws.rowCount, DIARIO_FIRST_ROW); r++) {
    const row = ws.getRow(r);
    if (cellText(row.getCell(2).value) || cellText(row.getCell(3).value)) {
      last = r;
      const n = cellNumber(row.getCell(1).value);
      if (n) lastItem = n;
    }
  }
  let r = last + 1;
  for (const item of items) {
    const row = ws.getRow(r);
    const current = cellNumber(row.getCell(1).value);
    if (!current) row.getCell(1).value = ++lastItem;
    else lastItem = current;
    row.getCell(2).value = item.cliente;
    row.getCell(3).value = item.factura;
    if (item.cajas) row.getCell(4).value = item.cajas;
    if (item.und) row.getCell(5).value = item.und;
    if (item.venta) row.getCell(6).value = item.venta;
    row.getCell(7).value = item.lugar;
    row.getCell(8).value = item.vendedor;
    row.commit();
    r++;
  }
}

function lastDataRow(ws: ExcelJS.Worksheet): number {
  let last = FIRST_DATA_ROW - 1;
  for (let r = FIRST_DATA_ROW; r <= Math.max(ws.rowCount, FIRST_DATA_ROW); r++) {
    const row = ws.getRow(r);
    if (cellText(row.getCell(2).value) || cellText(row.getCell(4).value)) last = r;
  }
  return last;
}

/** Appends pending invoices to their day sheets without touching styles/filters. */
export function appendInvoices(wb: ExcelJS.Workbook, pendings: PendingInvoice[]) {
  const bySheet = new Map<string, PendingInvoice[]>();
  pendings.forEach((p) => {
    const arr = bySheet.get(p.sheet) ?? [];
    arr.push(p);
    bySheet.set(p.sheet, arr);
  });

  for (const [sheet, items] of bySheet) {
    const ws = wb.getWorksheet(sheet);
    if (!ws) throw new Error(`Falta la hoja ${sheet} en el archivo.`);
    if (sheet === DIARIO_SHEET) {
      appendDiario(ws, items);
      continue;
    }
    let r = lastDataRow(ws) + 1;
    for (const item of items) {
      const row = ws.getRow(r);
      row.getCell(2).value = item.cliente;
      const d = fromISO(item.fecha);
      if (d) {
        row.getCell(3).value = d;
        if (!row.getCell(3).numFmt) row.getCell(3).numFmt = "d/m/yyyy";
      }
      row.getCell(4).value = item.factura;
      if (item.kilos) row.getCell(5).value = item.kilos;
      if (item.venta) row.getCell(6).value = item.venta;
      row.getCell(7).value = item.lugar;
      row.getCell(8).value = item.vendedor;
      row.commit();
      r++;
    }
  }
}

/** Writes the despacho header + selected invoices into the despacho sheet. */
export function writeDespacho(
  wb: ExcelJS.Workbook,
  header: DespachoHeader,
  allInvoices: Invoice[],
) {
  const viveres = allInvoices.filter((i) => isViveres(i.vendedor));
  if (viveres.length) writeGuia(wb, header, viveres);
  const invoices = allInvoices.filter((i) => !isViveres(i.vendedor));
  if (!invoices.length) return;
  const ws = wb.getWorksheet(DESPACHO_SHEET);
  if (!ws) return;
  ws.getCell("C3").value = header.zona;
  const fd = fromISO(header.fecha);
  if (fd) ws.getCell("H3").value = fd;
  ws.getCell("D4").value = header.chofer;
  ws.getCell("D5").value = header.vehiculo;
  ws.getCell("E6").value = header.g500;
  ws.getCell("H6").value = header.g900;
  ws.getCell("E7").value = header.carne;
  ws.getCell("H7").value = header.ahumada;

  let r = 9;
  invoices.forEach((inv, i) => {
    const row = ws.getRow(r);
    row.getCell(1).value = i + 1;
    row.getCell(2).value = inv.cliente;
    const d = fromISO(inv.fecha);
    if (d) row.getCell(3).value = d;
    row.getCell(4).value = inv.factura;
    row.getCell(5).value = inv.kilos || null;
    row.getCell(6).value = inv.venta || null;
    row.getCell(7).value = inv.lugar;
    row.getCell(8).value = inv.vendedor;
    row.commit();
    r++;
  });
  // clear leftover rows from a previous despacho (values only, styles untouched)
  for (let c = r; c <= 74; c++) {
    const row = ws.getRow(c);
    for (let col = 2; col <= 8; col++) row.getCell(col).value = null;
    row.commit();
  }
}

function writeGuia(wb: ExcelJS.Workbook, header: DespachoHeader, invoices: Invoice[]) {
  const ws = wb.getWorksheet(GUIA_SHEET);
  if (!ws) throw new Error(`Falta la hoja ${GUIA_SHEET} en el archivo.`);
  ws.getCell("C3").value = header.zona;
  const fd = fromISO(header.fecha);
  if (fd) ws.getCell("H3").value = fd;
  ws.getCell("C4").value = header.chofer;
  ws.getCell("C5").value = header.ayudante ?? "";
  ws.getCell("C6").value = header.vehiculo;
  ws.getCell("F8").value = invoices.reduce((a, b) => a + (b.cajas || 0), 0);
  ws.getCell("H8").value = invoices.length;
  let r = 10;
  invoices.forEach((inv, i) => {
    const row = ws.getRow(r++);
    row.getCell(1).value = i + 1;
    row.getCell(2).value = inv.cliente;
    row.getCell(3).value = inv.factura;
    row.getCell(4).value = inv.cajas || null;
    row.getCell(5).value = inv.und || null;
    row.getCell(6).value = inv.venta || null;
    row.getCell(7).value = inv.lugar;
    row.getCell(8).value = inv.vendedor;
    row.commit();
  });
  for (let c = r; c <= 80; c++) {
    const row = ws.getRow(c);
    for (let col = 2; col <= 8; col++) row.getCell(col).value = null;
    row.commit();
  }
}

export async function workbookToBytes(wb: ExcelJS.Workbook): Promise<Uint8Array> {
  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
};

const BLUE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF9DC3E6" },
};

const GREY_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9D9D9" },
};

function safeSheetName(value: string, used: Set<string>) {
  const base = value.replace(/[\\/*?:[\]]/g, " ").replace(/\s+/g, " ").trim() || "SIN VENDEDOR";
  let name = base.slice(0, 31);
  let suffix = 2;
  while (used.has(name.toUpperCase())) {
    const tail = ` ${suffix++}`;
    name = `${base.slice(0, 31 - tail.length)}${tail}`;
  }
  used.add(name.toUpperCase());
  return name;
}

function styleRange(
  ws: ExcelJS.Worksheet,
  row: number,
  firstColumn: number,
  lastColumn: number,
  fill?: ExcelJS.Fill,
) {
  for (let column = firstColumn; column <= lastColumn; column++) {
    const cell = ws.getCell(row, column);
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: "center", vertical: "middle", shrinkToFit: true };
    if (fill) cell.fill = fill;
  }
}

function addRelationSheet(
  wb: ExcelJS.Workbook,
  name: string,
  header: DespachoHeader,
  invoices: Invoice[],
  hideVenta: boolean,
) {
  const ws = wb.addWorksheet(name, {
    pageSetup: {
      orientation: "portrait",
      paperSize: 1 as ExcelJS.PaperSize,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: true,
      verticalCentered: false,
      margins: { left: 0.25, right: 0.25, top: 0.3, bottom: 0.3, header: 0, footer: 0 },
    },
    properties: { defaultRowHeight: 15 },
  });
  const headers = hideVenta
    ? ["ITEM", "CLIENTE", "FECHA", "FACTURA", "KILOS", "ZONA", "VENDEDOR"]
    : ["ITEM", "CLIENTE", "FECHA", "FACTURA", "KILOS", "VENTA", "ZONA", "VENDEDOR"];
  const widths = hideVenta ? [6, 34, 13, 12, 12, 20, 24] : [6, 30, 12, 11, 11, 13, 18, 22];
  const lastColumn = headers.length;
  const lastLetter = ws.getColumn(lastColumn).letter;
  widths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });

  ws.mergeCells(`A1:${lastLetter}1`);
  ws.mergeCells(`A2:${lastLetter}2`);
  ws.getCell("A1").value = "INVERSIONES EL CIBAO, C.A.";
  ws.getCell("A2").value = "J-40406894-5";
  ws.getRow(1).height = 22;
  ws.getRow(2).height = 17;
  for (const row of [1, 2]) {
    styleRange(ws, row, 1, lastColumn, BLUE_FILL);
    ws.getCell(row, 1).font = { name: "Arial", size: row === 1 ? 13 : 10, bold: true };
  }
  const logoId = wb.addImage({ base64: LOGO_PNG_BASE64, extension: "png" });
  ws.addImage(logoId, { tl: { col: 0.2, row: 0.15 }, ext: { width: 42, height: 31 } });

  const mergeAndSet = (range: string, value: string, fill?: ExcelJS.Fill) => {
    ws.mergeCells(range);
    const [startAddress, endAddress = startAddress] = range.split(":");
    if (!startAddress || !endAddress) return;
    const cell = ws.getCell(startAddress);
    cell.value = value;
    cell.font = { name: "Arial", size: 9, bold: true };
    const decode = (address: string) => {
      const match = /^([A-Z]+)(\d+)$/i.exec(address);
      if (!match?.[1] || !match[2]) return;
      const column = [...match[1].toUpperCase()].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0);
      return { row: Number(match[2]), column };
    };
    const start = decode(startAddress);
    const end = decode(endAddress);
    if (start && end) styleRange(ws, start.row, start.column, end.column, fill);
  };

  const rightStart = hideVenta ? "F" : "G";
  mergeAndSet("A3:C3", "ZONA DE DESPACHO", GREY_FILL);
  mergeAndSet(`D3:E3`, header.zona.toUpperCase());
  mergeAndSet(`${rightStart}3:${lastLetter}3`, `FECHA DE DESPACHO: ${formatDate(header.fecha)}`, GREY_FILL);
  mergeAndSet("A4:C4", "CHOFER Y AYUDANTE", GREY_FILL);
  mergeAndSet(`D4:${lastLetter}4`, header.chofer.toUpperCase());
  mergeAndSet("A5:C5", "VEHICULO ASIGNADO", GREY_FILL);
  mergeAndSet(`D5:${lastLetter}5`, header.vehiculo.toUpperCase());
  mergeAndSet("A6:B7", "MORTADELAS A DESPACHAR", GREY_FILL);
  mergeAndSet("C6:D6", `500GR: ${header.g500}`);
  mergeAndSet(`E6:${lastLetter}6`, `900GR: ${header.g900}`);
  mergeAndSet("C7:D7", `CARNE: ${header.carne}`);
  mergeAndSet(`E7:${lastLetter}7`, `AHUMADA: ${header.ahumada}`);

  headers.forEach((value, index) => {
    const cell = ws.getCell(8, index + 1);
    cell.value = value;
    cell.font = { name: "Arial", size: 8, bold: true };
  });
  styleRange(ws, 8, 1, lastColumn, GREY_FILL);
  ws.getRow(8).height = 18;

  invoices.forEach((invoice, index) => {
    const rowNumber = index + 9;
    const values: (string | number | Date)[] = hideVenta
      ? [index + 1, invoice.cliente, fromISO(invoice.fecha) ?? invoice.fecha, invoice.factura, invoice.kilos, invoice.lugar, invoice.vendedor]
      : [index + 1, invoice.cliente, fromISO(invoice.fecha) ?? invoice.fecha, invoice.factura, invoice.kilos, invoice.venta, invoice.lugar, invoice.vendedor];
    values.forEach((value, columnIndex) => {
      const cell = ws.getCell(rowNumber, columnIndex + 1);
      cell.value = value;
      cell.font = { name: "Arial", size: 8 };
      if (columnIndex === 2 && value instanceof Date) cell.numFmt = "d/m/yyyy";
      if (columnIndex === 4 || (!hideVenta && columnIndex === 5)) cell.numFmt = "#,##0.00";
    });
    styleRange(ws, rowNumber, 1, lastColumn);
    ws.getCell(rowNumber, 2).alignment = { horizontal: "left", vertical: "middle", shrinkToFit: true };
  });

  const firstDataRow = 9;
  const lastDataRow = firstDataRow + invoices.length - 1;
  const totalsRow = lastDataRow + 1;
  const kilosCell = ws.getCell(totalsRow, 5);
  kilosCell.value = { formula: `SUM(E${firstDataRow}:E${lastDataRow})` };
  kilosCell.numFmt = "#,##0.00";
  kilosCell.font = { name: "Arial", size: 8, bold: true };
  kilosCell.fill = GREY_FILL;
  if (!hideVenta) {
    const ventaCell = ws.getCell(totalsRow, 6);
    ventaCell.value = { formula: `SUM(F${firstDataRow}:F${lastDataRow})` };
    ventaCell.numFmt = "#,##0.00";
    ventaCell.font = { name: "Arial", size: 8, bold: true };
    ventaCell.fill = GREY_FILL;
  }
  styleRange(ws, totalsRow, 1, lastColumn);

  const signatureRow = totalsRow + 3;
  const red = "FF9C241C";
  mergeAndSet(`A${signatureRow}:C${signatureRow}`, "____________________________");
  mergeAndSet(`${rightStart}${signatureRow}:${lastLetter}${signatureRow}`, "____________________________");
  mergeAndSet(`A${signatureRow + 1}:C${signatureRow + 1}`, "CHOFER");
  mergeAndSet(`${rightStart}${signatureRow + 1}:${lastLetter}${signatureRow + 1}`, "FACTURACION");
  mergeAndSet(`A${signatureRow + 2}:C${signatureRow + 2}`, "RECIBI CONFORME LAS FACTURAS Y MERCANCIA");
  mergeAndSet(`${rightStart}${signatureRow + 2}:${lastLetter}${signatureRow + 2}`, "RECIBI CONFORME Y EN ORDEN LAS FACTURAS");
  ws.getCell(`A${signatureRow + 2}`).font = { name: "Arial", size: 7, color: { argb: red } };
  ws.getCell(`${rightStart}${signatureRow + 2}`).font = { name: "Arial", size: 7, color: { argb: red } };
  mergeAndSet(`B${signatureRow + 4}:${hideVenta ? "F" : "G"}${signatureRow + 4}`, "____________________________");
  mergeAndSet(`B${signatureRow + 5}:${hideVenta ? "F" : "G"}${signatureRow + 5}`, "JEFE DEPOSITO");
  mergeAndSet(`B${signatureRow + 6}:${hideVenta ? "F" : "G"}${signatureRow + 6}`, "RECIBI CONFORME CESTAS Y NOVEDADES");
  ws.getCell(`B${signatureRow + 6}`).font = { name: "Arial", size: 7, color: { argb: red } };
  mergeAndSet(`${hideVenta ? "E" : "F"}${signatureRow + 8}:${lastLetter}${signatureRow + 8}`, "DESPACHO NRO: ____________");

  ws.pageSetup.printArea = `A1:${lastLetter}${signatureRow + 8}`;
  ws.views = [{ state: "frozen", ySplit: 8 }];
}

function addGuiaSheet(wb: ExcelJS.Workbook, name: string, header: DespachoHeader, invoices: Invoice[]) {
  const ws = wb.addWorksheet(name, {
    pageSetup: {
      orientation: "portrait",
      paperSize: 1 as ExcelJS.PaperSize,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: true,
      margins: { left: 0.25, right: 0.25, top: 0.3, bottom: 0.3, header: 0, footer: 0 },
    },
  });
  [6, 32, 11, 9, 8, 11, 16, 22].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  const put = (range: string, value: string | number, fill?: ExcelJS.Fill, bold = true) => {
    ws.mergeCells(range);
    const [a, b = a] = range.split(":");
    if (!a || !b) return;
    const ca = ws.getCell(a);
    const cb = ws.getCell(b);
    ca.value = value;
    styleRange(ws, Number(ca.row), Number(ca.col), Number(cb.col), fill);
    ca.font = { name: "Arial", size: 9, bold };
  };
  put("A1:H2", "INVERSIONES EL CIBAO, C.A.\nJ-40406894-5", BLUE_FILL);
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  ws.getCell("A1").font = { name: "Arial", size: 12, bold: true };
  ws.getRow(1).height = 20;
  ws.getRow(2).height = 20;
  const logoId = wb.addImage({ base64: LOGO_PNG_BASE64, extension: "png" });
  ws.addImage(logoId, { tl: { col: 0.3, row: 0.2 }, ext: { width: 46, height: 34 } });
  put("A3:B3", "ZONA DE DESPACHO", GREY_FILL);
  put("C3:E3", header.zona.toUpperCase());
  put("F3:G3", "FECHA DE DESPACHO", GREY_FILL);
  put("H3:H3", formatDate(header.fecha));
  put("A4:B4", "CHOFER", GREY_FILL);
  put("C4:H4", header.chofer.toUpperCase());
  put("A5:B5", "AYUDANTE", GREY_FILL);
  put("C5:H5", (header.ayudante ?? "").toUpperCase());
  put("A6:B6", "VEHICULO ASIGNADO", GREY_FILL);
  put("C6:H6", header.vehiculo.toUpperCase());
  ws.getRow(7).hidden = true;
  put("A8:B8", "SALIDA DE CAJAS", GREY_FILL);
  put("C8:E8", "CAJAS TOTALES", GREY_FILL);
  put("F8:F8", invoices.reduce((a, b) => a + (b.cajas || 0), 0));
  put("G8:G8", "TOTAL FACTURAS", GREY_FILL);
  put("H8:H8", invoices.length);
  ["ITEM", "CLIENTE", "FACTURA", "N. CAJAS", "UND", "VENTA", "ZONA", "VENDEDOR"].forEach((h, i) => {
    const c = ws.getCell(9, i + 1);
    c.value = h;
    c.font = { name: "Arial", size: 8, bold: true };
  });
  styleRange(ws, 9, 1, 8, GREY_FILL);
  invoices.forEach((inv, i) => {
    const r = 10 + i;
    [i + 1, inv.cliente, inv.factura, inv.cajas || "", inv.und || "", inv.venta || "", inv.lugar, inv.vendedor].forEach((v, c) => {
      const cell = ws.getCell(r, c + 1);
      cell.value = v;
      cell.font = { name: "Arial", size: 8 };
      if (c === 5) cell.numFmt = "#,##0.00";
    });
    styleRange(ws, r, 1, 8);
    ws.getCell(r, 2).alignment = { horizontal: "left", vertical: "middle", shrinkToFit: true };
  });
  const tr = 10 + invoices.length;
  const last = tr - 1;
  ws.getCell(tr, 4).value = { formula: `SUM(D10:D${last})` };
  ws.getCell(tr, 5).value = { formula: `SUM(E10:E${last})` };
  ws.getCell(tr, 6).value = { formula: `SUM(F10:F${last})` };
  ws.getCell(tr, 6).numFmt = "#,##0.00";
  styleRange(ws, tr, 4, 6, GREY_FILL);
  const s = tr + 3;
  const red = { name: "Arial", size: 7, color: { argb: "FF9C241C" } };
  put(`A${s}:C${s}`, "____________________________", undefined);
  put(`F${s}:H${s}`, "____________________________", undefined);
  put(`A${s + 1}:C${s + 1}`, "CHOFER");
  put(`F${s + 1}:H${s + 1}`, "FACTURACION");
  put(`A${s + 2}:C${s + 2}`, "RECIBI CONFORME LAS FACTURAS Y MERCANCIA");
  put(`F${s + 2}:H${s + 2}`, "RECIBI CONFORME Y EN ORDEN LAS FACTURAS");
  ws.getCell(`A${s + 2}`).font = red;
  ws.getCell(`F${s + 2}`).font = red;
  put(`B${s + 4}:G${s + 4}`, "____________________________");
  put(`B${s + 5}:G${s + 5}`, "JEFE DEPOSITO");
  put(`B${s + 6}:G${s + 6}`, "RECIBI CONFORME CESTAS Y NOVEDADES");
  ws.getCell(`B${s + 6}`).font = red;
  put(`F${s + 8}:H${s + 8}`, "DESPACHO NRO: ____________");
  ws.pageSetup.printArea = `A1:H${s + 8}`;
}

/** Creates one workbook containing the two complete relations and one sheet per exact seller/brand. */
export async function buildDespachoExcel(
  header: DespachoHeader,
  allInvoices: Invoice[],
): Promise<{ name: string; data: Uint8Array }> {
  const invoices = allInvoices.filter((i) => !isViveres(i.vendedor));
  const viveres = allInvoices.filter((i) => isViveres(i.vendedor));
  const wb = new ExcelJS.Workbook();
  wb.creator = "Inversiones El Cibao";
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;
  const used = new Set<string>();
  if (invoices.length) {
    addRelationSheet(wb, safeSheetName("COMPLETA CON VENTA", used), header, invoices, false);
    addRelationSheet(wb, safeSheetName("COMPLETA SIN VENTA", used), header, invoices, true);
  }
  if (viveres.length) {
    addGuiaSheet(wb, safeSheetName("GUIA VIVERES", used), header, viveres);
    const vg = new Map<string, Invoice[]>();
    viveres.forEach((i) => {
      const k = (i.vendedor || "").toUpperCase().trim();
      vg.set(k, [...(vg.get(k) ?? []), i]);
    });
    if (vg.size > 1) vg.forEach((rows, k) => addGuiaSheet(wb, safeSheetName(`GUIA ${k}`, used), header, rows));
  }

  const groups = new Map<string, Invoice[]>();
  invoices.forEach((invoice) => {
    const key = (invoice.vendedor || "SIN VENDEDOR").toUpperCase().trim();
    groups.set(key, [...(groups.get(key) ?? []), invoice]);
  });
  groups.forEach((rows, seller) => {
    addRelationSheet(wb, safeSheetName(seller, used), headerParaFacturas(header, rows), rows, false);
  });

  return {
    name: `RELACIONES_DESPACHO_${header.fecha || toISO(new Date())}.xlsx`,
    data: await workbookToBytes(wb),
  };
}

/** Lista de facturas filtrada (Excel) con totales por fórmula; las anuladas no suman. */
export async function buildListaFacturasExcel(
  rows: (Invoice & { anulada?: boolean; estado?: string })[],
  periodo: string,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Inversiones El Cibao";
  wb.calcProperties.fullCalcOnLoad = true;
  const ws = wb.addWorksheet("FACTURAS");
  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = "INVERSIONES EL CIBAO · LISTA DE FACTURAS";
  ws.getCell("A1").font = { name: "Arial", bold: true, size: 13 };
  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = periodo;
  ws.getCell("A2").font = { name: "Arial", size: 10 };
  const head = ["CLIENTE", "FECHA", "FACTURA", "KILOS", "CAJAS", "UND", "VENTA", "LUGAR", "VENDEDOR", "ESTADO"];
  const hr = ws.getRow(4);
  head.forEach((h, i) => {
    const c = hr.getCell(i + 1);
    c.value = h;
    c.font = { name: "Arial", bold: true, size: 10 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
    c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  rows.forEach((f, idx) => {
    const r = ws.getRow(5 + idx);
    r.values = [
      f.cliente, formatDate(f.fecha), f.factura,
      f.diario ? 0 : f.kilos || 0, f.diario ? f.cajas ?? 0 : 0, f.diario ? f.und ?? 0 : 0,
      f.venta || 0, f.lugar, f.vendedor, f.estado ?? (f.anulada ? "ANULADA" : ""),
    ];
    r.font = { name: "Arial", size: 10 };
  });
  const last = 4 + rows.length;
  const t = ws.getRow(last + 1);
  t.getCell(1).value = "TOTAL (sin anuladas)";
  if (rows.length) {
    const sumIf = (col: string) => ({ formula: `SUMIF(J5:J${last},"<>ANULADA*",${col}5:${col}${last})` });
    t.getCell(3).value = { formula: `COUNTA(C5:C${last})-COUNTIF(J5:J${last},"ANULADA*")` };
    t.getCell(4).value = sumIf("D");
    t.getCell(5).value = sumIf("E");
    t.getCell(6).value = sumIf("F");
    t.getCell(7).value = sumIf("G");
  }
  t.font = { name: "Arial", bold: true, size: 10 };
  [32, 12, 12, 12, 9, 9, 13, 18, 22, 22].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ["D", "G"].forEach((c) => (ws.getColumn(c).numFmt = "#,##0.00"));
  ws.views = [{ state: "frozen", ySplit: 4 }];
  return workbookToBytes(wb);
}
