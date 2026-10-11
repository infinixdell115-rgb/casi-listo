import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Grupo } from "./checklistStats";

const W = 612, H = 792, M = 36;
// WinAnsi fonts can't encode some characters; strip to safe range.
const safe = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");

export async function buildReporteProductosPdf(opts: {
  subtitulo: string;
  total: number;
  secciones: { titulo: string; filas: Grupo[] }[];
}) {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const fb = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([W, H]);
  let y = H - M;
  const line = (t: string, x: number, font = f, size = 10, right = false) => {
    const s = safe(t);
    page.drawText(s, { x: right ? x - font.widthOfTextAtSize(s, size) : x, y, size, font, color: rgb(0, 0, 0) });
  };
  const need = (h: number) => {
    if (y - h < M) { page = doc.addPage([W, H]); y = H - M; }
  };
  line("REPORTE DE KILOS POR PRODUCTO (CHECKLIST)", M, fb, 14); y -= 18;
  line(opts.subtitulo, M, f, 10); y -= 14;
  line(`Total: ${opts.total.toFixed(2)} kg`, M, fb, 11); y -= 22;
  for (const s of opts.secciones) {
    need(40);
    page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: 16, color: rgb(0.88, 0.88, 0.88) });
    line(s.titulo, M + 4, fb, 10); line("Kilos", W - M - 70, fb, 10, true); line("%", W - M - 4, fb, 10, true);
    y -= 18;
    s.filas.forEach((g, i) => {
      need(14);
      line(`${i + 1}. ${g.nombre}`.slice(0, 70), M + 4);
      line(g.kilos.toFixed(2), W - M - 70, f, 10, true);
      line(`${g.pct.toFixed(1)}%`, W - M - 4, f, 10, true);
      y -= 13;
    });
    y -= 12;
  }
  return doc.save();
}
