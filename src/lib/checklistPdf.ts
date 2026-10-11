import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Checklist, ChecklistDatos } from "./types";

const BLACK = rgb(0, 0, 0);
export const CHECKLIST_ROWS = 8;

function fit(text: string, font: PDFFont, size: number, maxW: number) {
  let s = text ?? "";
  let sz = size;
  while (sz > 5 && font.widthOfTextAtSize(s, sz) > maxW) sz -= 0.5;
  while (s.length > 0 && font.widthOfTextAtSize(s, sz) > maxW) s = s.slice(0, -1);
  return { s, sz };
}

function drawBlock(page: PDFPage, font: PDFFont, bold: PDFFont, c: ChecklistDatos, x0: number, top: number) {
  const W = 366;
  const px = (p: number) => x0 + (p / 1011) * W;
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 1, color: BLACK });
  const text = (t: string, x: number, y: number, f: PDFFont, size: number, maxW: number) => {
    const { s, sz } = fit(t, f, size, maxW);
    page.drawText(s, { x, y, size: sz, font: f, color: BLACK });
  };
  const rows = [35, 30, 30, 30, 25, ...Array(CHECKLIST_ROWS).fill(18.5)] as number[];
  const total = rows.reduce((a, b) => a + b, 0);
  page.drawRectangle({ x: x0, y: top - total, width: W, height: total, borderColor: BLACK, borderWidth: 1.2 });
  const ysRaw: number[] = [top];
  rows.forEach((h) => ysRaw.push((ysRaw[ysRaw.length - 1] ?? top) - h));
  const Y = (i: number) => ysRaw[i] ?? 0;
  const LAST = ysRaw.length - 1;
  for (let i = 1; i < LAST; i++) line(x0, Y(i), x0 + W, Y(i));
  const mid = (i: number) => (Y(i) + Y(i + 1)) / 2 - 3.5;

  // Jefe
  line(px(330), Y(0), px(330), Y(1));
  text("JEFE DE DEPOSITO:", px(28), mid(0), bold, 9.5, px(320) - px(28));
  text(c.jefe, px(345), mid(0), font, 10, px(1000) - px(345));
  // Vendedor + fecha
  line(px(206), Y(1), px(206), Y(3));
  line(px(678), Y(1), px(678), Y(3));
  line(px(789), Y(1), px(789), Y(2));
  line(px(900), Y(1), px(900), Y(2));
  text("VENDEDOR:", px(14), mid(1), bold, 9.5, px(200) - px(14));
  text(c.vendedor, px(220), mid(1), font, 10, px(670) - px(220));
  ([["DÍA", c.dia], ["MES", c.mes], ["AÑO", c.anio]] as const).forEach(([l, v], i) => {
    const x = px(690 + i * 111);
    text(l, x, Y(1) - 10, font, 6.5, 35);
    text(String(v), x, Y(2) + 6, font, 9.5, 35);
  });
  // Dirección + factura
  line(px(871), Y(2), px(871), Y(3));
  text("DIRECCIÓN:", px(14), mid(2), bold, 9.5, px(200) - px(14));
  text(c.direccion, px(220), mid(2), font, 10, px(670) - px(220));
  text("N° FACTURA:", px(690), mid(2), bold, 8, px(865) - px(690));
  text(c.factura, px(880), mid(2), font, 10, px(1005) - px(880));
  // Cliente
  line(px(206), Y(3), px(206), Y(4));
  text("CLIENTE:", px(14), mid(3), bold, 9.5, px(200) - px(14));
  text(c.cliente, px(220), mid(3), font, 10, px(1000) - px(220));
  // Tabla
  line(px(124), Y(4), px(124), Y(LAST));
  line(px(861), Y(4), px(861), Y(LAST));
  text("CANT", px(28), mid(4), bold, 8.5, 40);
  text("DESCRIPCIÓN DEL PEDIDO", px(275), mid(4), bold, 8.5, 200);
  text("PESO", px(888), mid(4), bold, 8.5, 40);
  for (let r = 0; r < CHECKLIST_ROWS; r++) {
    const it = c.items[r];
    if (!it) continue;
    text(it.cant, px(10), mid(5 + r), font, 9.5, px(118) - px(10));
    text(it.descripcion, px(134), mid(5 + r), font, 9.5, px(855) - px(134));
  }
  return total;
}

export async function buildChecklistPdf(c: Checklist): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Checklist ${c.factura}`);
  const page = doc.addPage([792, 612]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const h = drawBlock(page, font, bold, c, 4, 608);
  const vacio: ChecklistDatos = { jefe: "", vendedor: "", direccion: "", cliente: "", factura: "", dia: "", mes: "", anio: "", items: [] };
  drawBlock(page, font, bold, c.segundo ?? vacio, 4, 608 - h - 4);
  // hoja carta vertical: los dos checklist quedan girados en la mitad superior
  page.setRotation(degrees(90));
  return doc.save();
}

export function checklistFileName(c: Checklist) {
  const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_").slice(0, 40);
  return `Checklist_Factura-${clean(c.factura || "sin")}_${clean(c.cliente || "cliente")}.pdf`;
}
