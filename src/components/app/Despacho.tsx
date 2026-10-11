import { useEffect, useMemo, useState } from "react";
import { Eye, FileDown, FileSpreadsheet, Printer, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, ComboInput, Field, TextInput, inputClass } from "./ui";
import { toFactura, useStore, type Row } from "@/lib/store";
import { ordenarPorCorrelativo } from "@/lib/facturas";
import { buildDespachoExcel, formatDate, toISO } from "@/lib/excel";
import { buildAllDespachoPdfs, buildPreviewPdf } from "@/lib/pdf";
import { printPdf, saveDespachoExcel, savePdfFiles } from "@/lib/desktop";
import { api } from "@/lib/api";
import { DespachosHechos } from "./DespachosHechos";
import type { FacturaDb } from "@/lib/store";
import { isViveres, sumarMortadelas, type DespachoHeader, type Invoice } from "@/lib/types";

function uniq(list: string[]) {
  return Array.from(new Set(list.filter(Boolean))).sort();
}

export function Despacho() {
  const { invoices: invSemana, sidecar, setDespachoHeader, setSeleccionadas, busy, semana, user } =
    useStore();
  const registrar = (tipo: "pdf" | "excel", h: DespachoHeader, rows: Invoice[]) =>
    void api("/api/despachos", { method: "POST", body: { tipo, header: h, facturas: rows } }).catch((e) =>
      toast.error("No se pudo guardar en el historial: " + (e as Error).message),
    );

  const [header, setHeader] = useState<DespachoHeader>(() => ({
    ...sidecar.despacho.header,
    fecha: sidecar.despacho.header.fecha || toISO(new Date()),
  }));
  const [sel, setSel] = useState<string[]>(sidecar.despacho.seleccionadas);
  const [fVendedor, setFVendedor] = useState("");
  const [fLugar, setFLugar] = useState("");
  const [fFecha, setFFecha] = useState("");
  const [fTipo, setFTipo] = useState<"" | "viveres" | "normal">("");
  const [preview, setPreview] = useState<string | null>(null);
  const [rDesde, setRDesde] = useState("");
  const [rHasta, setRHasta] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>(invSemana);
  useEffect(() => {
    let vivo = true;
    const q = rDesde && rHasta ? `desde=${rDesde}&hasta=${rHasta}` : "";
    api<Row[]>(`/api/facturas?${q}`)
      .then((d) => { if (vivo) setInvoices(ordenarPorCorrelativo(d.map(toFactura).filter((f) => !f.anulada))); })
      .catch(() => { if (vivo) setInvoices(invSemana); });
    return () => { vivo = false; };
  }, [semana, rDesde, rHasta, invSemana]);
  const [editHeader, setEditHeader] = useState<DespachoHeader | null>(null);
  const [editRows, setEditRows] = useState<Invoice[]>([]);

  useEffect(() => {
    setHeader({
      ...sidecar.despacho.header,
      fecha: sidecar.despacho.header.fecha || toISO(new Date()),
    });
    setSel(sidecar.despacho.seleccionadas);
    closePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semana]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const vendedores = useMemo(() => uniq(invoices.map((i) => i.vendedor)), [invoices]);
  const lugares = useMemo(() => uniq(invoices.map((i) => i.lugar)), [invoices]);
  const zonas = useMemo(() => uniq(invoices.map((i) => i.lugar)), [invoices]);

  const filtradas = useMemo(
    () =>
      invoices.filter(
        (i) =>
          (!fVendedor || i.vendedor === fVendedor) &&
          (!fLugar || i.lugar === fLugar) &&
          (!fFecha || i.fecha === fFecha) &&
          (!fTipo || (fTipo === "viveres") === (!!i.diario || isViveres(i.vendedor))),
      ),
    [invoices, fVendedor, fLugar, fFecha, fTipo],
  );

  const seleccionadas: Invoice[] = useMemo(
    () => sel.map((id) => invoices.find((i) => i.id === id)).filter(Boolean) as Invoice[],
    [sel, invoices],
  );

  // Carga automática de mortadelas en la planilla según las facturas seleccionadas
  const mortKey = JSON.stringify(sumarMortadelas(seleccionadas.filter((i) => !isViveres(i.vendedor))));
  useEffect(() => {
    const m = JSON.parse(mortKey);
    if (m && (m.g500 !== header.g500 || m.g900 !== header.g900 || m.carne !== header.carne || m.ahumada !== header.ahumada)) update(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mortKey]);

  const totalKilos = seleccionadas.reduce((a, b) => a + (b.kilos || 0), 0);

  const update = (patch: Partial<DespachoHeader>) => {
    const next = { ...header, ...patch };
    setHeader(next);
    setDespachoHeader(next);
  };

  const toggle = (id: string) => {
    const next = sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id];
    setSel(next);
    setSeleccionadas(next);
  };

  const requireRows = () => {
    if (seleccionadas.length === 0) {
      toast.error("Selecciona al menos una factura.");
      return false;
    }
    return true;
  };

  function closePreview() {
    setPreview((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    setEditHeader(null);
    setEditRows([]);
  }

  const renderPreview = async (h: DespachoHeader, rows: Invoice[]) => {
    if (rows.length === 0) {
      toast.error("No quedan facturas en la relación.");
      return;
    }
    const bytes = await buildPreviewPdf(h, rows);
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(blob);
    });
  };

  const vistaPrevia = async () => {
    if (!requireRows()) return;
    setEditHeader({ ...header });
    setEditRows(seleccionadas.map((i) => ({ ...i })));
    await renderPreview(header, seleccionadas);
  };

  const guardarPdfs = async (h = header, rows = seleccionadas) => {
    if (rows.length === 0) {
      toast.error("Selecciona al menos una factura.");
      return;
    }
    const files = await buildAllDespachoPdfs(h, rows);
    const destination = await savePdfFiles(files.map((f) => ({ name: f.name, data: f.data })));
    if (!destination) return;
    registrar("pdf", h, rows);
    setSel([]);
    setSeleccionadas([]);
    toast.success(`${files.length} relaciones guardadas en la carpeta de la fecha.`);
  };

  const guardarExcel = async (h = header, rows = seleccionadas) => {
    if (rows.length === 0) {
      toast.error("Selecciona al menos una factura.");
      return;
    }
    const file = await buildDespachoExcel(h, rows);
    const destination = await saveDespachoExcel(file.name, file.data);
    if (!destination) return;
    registrar("excel", h, rows);
    setSel([]);
    setSeleccionadas([]);
    toast.success("Relaciones guardadas en un archivo Excel en la carpeta de la fecha.");
  };

  const imprimir = async (h = header, rows = seleccionadas) => {
    if (rows.length === 0) {
      toast.error("Selecciona al menos una factura.");
      return;
    }
    const bytes = await buildPreviewPdf(h, rows);
    await printPdf(bytes);
  };

  const patchRow = (idx: number, patch: Partial<Invoice>) =>
    setEditRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const editKilos = editRows.reduce((a, b) => a + (b.kilos || 0), 0);
  const editVenta = editRows.reduce((a, b) => a + (b.venta || 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <Card title="Datos del despacho">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Zona de despacho">
            <ComboInput
              options={zonas}
              value={header.zona}
              placeholder="Zona"
              onChange={(e) => update({ zona: e.target.value })}
            />
          </Field>
          <Field label="Fecha de despacho">
            <TextInput
              type="date"
              value={header.fecha}
              onChange={(e) => update({ fecha: e.target.value })}
            />
          </Field>
          <Field label="Ayudante (guía víveres)">
            <TextInput
              value={header.ayudante ?? ""}
              onChange={(e) => update({ ayudante: e.target.value })}
            />
          </Field>
          <Field label="Chofer y ayudante" className="md:col-span-2">
            <TextInput
              value={header.chofer}
              placeholder="Chofer - Ayudante"
              onChange={(e) => update({ chofer: e.target.value })}
            />
          </Field>
          <Field label="Vehículo asignado">
            <TextInput
              value={header.vehiculo}
              placeholder="Vehículo"
              onChange={(e) => update({ vehiculo: e.target.value })}
            />
          </Field>
          <Field label="500 GR">
            <TextInput value={header.g500} onChange={(e) => update({ g500: e.target.value })} />
          </Field>
          <Field label="900 GR">
            <TextInput value={header.g900} onChange={(e) => update({ g900: e.target.value })} />
          </Field>
          <Field label="Carne">
            <TextInput value={header.carne} onChange={(e) => update({ carne: e.target.value })} />
          </Field>
          <Field label="Ahumada">
            <TextInput
              value={header.ahumada}
              onChange={(e) => update({ ahumada: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      <Card
        title="Facturas registradas"
        badge={<Badge>{seleccionadas.length} seleccionadas</Badge>}
      >
        <div className="mb-4 grid gap-4 md:grid-cols-4">
          <Field label="Desde (opcional)">
            <input type="date" className={inputClass} value={rDesde} onChange={(e) => setRDesde(e.target.value)} />
          </Field>
          <Field label="Hasta (opcional)">
            <input type="date" className={inputClass} value={rHasta} onChange={(e) => setRHasta(e.target.value)} />
          </Field>
          <p className="self-end pb-2 text-xs text-muted-foreground md:col-span-2">
            {rDesde && rHasta ? "Mostrando facturas por fecha en el rango elegido." : "Mostrando todas las facturas. Usa Desde / Hasta para filtrar."}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Tipo de factura">
            <select className={inputClass} value={fTipo} onChange={(e) => setFTipo(e.target.value as typeof fTipo)}>
              <option value="">Todas</option>
              <option value="normal">Solo normales</option>
              <option value="viveres">Solo víveres</option>
            </select>
          </Field>
          <Field label="Filtrar por vendedor">
            <select
              className={inputClass}
              value={fVendedor}
              onChange={(e) => setFVendedor(e.target.value)}
            >
              <option value="">Todos</option>
              {vendedores.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Filtrar por lugar">
            <select className={inputClass} value={fLugar} onChange={(e) => setFLugar(e.target.value)}>
              <option value="">Todos</option>
              {lugares.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Filtrar por fecha">
            <TextInput type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)} />
          </Field>
        </div>

        <div className="mt-4 max-h-96 overflow-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2" />
                <th className="px-2 py-2 text-left">Cliente</th>
                <th className="px-2 py-2 text-left">Fecha</th>
                <th className="px-2 py-2 text-left">Factura</th>
                <th className="px-2 py-2 text-right">Kilos / Cajas</th>
                <th className="px-2 py-2 text-right">Venta</th>
                <th className="px-2 py-2 text-left">Zona</th>
                <th className="px-2 py-2 text-left">Vendedor</th>
                {user.esAdmin && <th className="px-2 py-2 text-left">Registrado por</th>}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((i) => (
                <tr
                  key={i.id}
                  className="cursor-pointer border-b border-border/60 hover:bg-accent"
                  onClick={() => toggle(i.id)}
                >
                  <td className="px-2 py-1.5">
                    <input type="checkbox" readOnly checked={sel.includes(i.id)} />
                  </td>
                  <td className="px-2 py-1.5">{i.cliente}</td>
                  <td className="px-2 py-1.5">{formatDate(i.fecha)}</td>
                  <td className="px-2 py-1.5">{i.factura}</td>
                  <td className="px-2 py-1.5 text-right">
                    {i.diario ? `${i.cajas || 0} cj / ${i.und || 0} und` : i.kilos.toFixed(2)}
                  </td>
                  <td className="px-2 py-1.5 text-right">{i.venta.toFixed(2)}</td>
                  <td className="px-2 py-1.5">{i.lugar}</td>
                  <td className="px-2 py-1.5">
                    {i.vendedor}
                    {isViveres(i.vendedor) && <Badge>Víveres</Badge>}
                  </td>
                  {user.esAdmin && <td className="px-2 py-1.5">{(i as FacturaDb).creadoPor || "—"}</td>}
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-2 py-8 text-center text-muted-foreground">
                    No hay facturas para esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Total kilos seleccionados: <strong className="text-foreground">{totalKilos.toFixed(2)}</strong>
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => void vistaPrevia()}>
              <Eye className="size-4" /> Vista previa
            </Button>
            <Button onClick={() => void guardarPdfs()} disabled={busy}>
              <FileDown className="size-4" /> Guardar PDF
            </Button>
            <Button variant="outline" onClick={() => void guardarExcel()} disabled={busy}>
              <FileSpreadsheet className="size-4" /> Guardar Excel
            </Button>
            <Button variant="outline" onClick={() => void imprimir()}>
              <Printer className="size-4" /> Imprimir
            </Button>
          </div>
        </div>
      </Card>

      {preview && editHeader && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closePreview}
        >
          <div
            className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
              <h3 className="text-sm font-semibold uppercase">Vista previa editable</h3>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void renderPreview(editHeader, editRows)}
                >
                  <RefreshCw className="size-4" /> Actualizar vista
                </Button>
                <Button onClick={() => void guardarPdfs(editHeader, editRows)} disabled={busy}>
                  <FileDown className="size-4" /> Guardar PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void guardarExcel(editHeader, editRows)}
                  disabled={busy}
                >
                  <FileSpreadsheet className="size-4" /> Guardar Excel
                </Button>
                <Button variant="outline" onClick={() => void imprimir(editHeader, editRows)}>
                  <Printer className="size-4" /> Imprimir
                </Button>
                <Button variant="outline" onClick={closePreview}>
                  Cerrar
                </Button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-2">
              <div className="overflow-auto border-r border-border p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Zona de despacho">
                    <ComboInput
                      options={zonas}
                      value={editHeader.zona}
                      onChange={(e) => setEditHeader({ ...editHeader, zona: e.target.value })}
                    />
                  </Field>
                  <Field label="Fecha de despacho">
                    <TextInput
                      type="date"
                      value={editHeader.fecha}
                      onChange={(e) => setEditHeader({ ...editHeader, fecha: e.target.value })}
                    />
                  </Field>
                  <Field label="Chofer y ayudante">
                    <TextInput
                      value={editHeader.chofer}
                      onChange={(e) => setEditHeader({ ...editHeader, chofer: e.target.value })}
                    />
                  </Field>
                  <Field label="Ayudante (víveres)">
                    <TextInput
                      value={editHeader.ayudante ?? ""}
                      onChange={(e) => setEditHeader({ ...editHeader, ayudante: e.target.value })}
                    />
                  </Field>
                  <Field label="Vehículo asignado">
                    <TextInput
                      value={editHeader.vehiculo}
                      onChange={(e) => setEditHeader({ ...editHeader, vehiculo: e.target.value })}
                    />
                  </Field>
                  <Field label="500 GR">
                    <TextInput
                      value={editHeader.g500}
                      onChange={(e) => setEditHeader({ ...editHeader, g500: e.target.value })}
                    />
                  </Field>
                  <Field label="900 GR">
                    <TextInput
                      value={editHeader.g900}
                      onChange={(e) => setEditHeader({ ...editHeader, g900: e.target.value })}
                    />
                  </Field>
                  <Field label="Carne">
                    <TextInput
                      value={editHeader.carne}
                      onChange={(e) => setEditHeader({ ...editHeader, carne: e.target.value })}
                    />
                  </Field>
                  <Field label="Ahumada">
                    <TextInput
                      value={editHeader.ahumada}
                      onChange={(e) => setEditHeader({ ...editHeader, ahumada: e.target.value })}
                    />
                  </Field>
                </div>

                <div className="mt-4 overflow-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted text-[10px] uppercase text-muted-foreground">
                      <tr>
                        <th className="px-1 py-1 text-left">Cliente</th>
                        <th className="px-1 py-1">Fecha</th>
                        <th className="px-1 py-1">Factura</th>
                        <th className="px-1 py-1">Kilos</th>
                        <th className="px-1 py-1">Venta</th>
                        <th className="px-1 py-1">Zona</th>
                        <th className="px-1 py-1">Vendedor</th>
                        <th className="px-1 py-1" />
                      </tr>
                    </thead>
                    <tbody>
                      {editRows.map((r, idx) => (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="px-1 py-1">
                            <input
                              className="w-40 rounded border border-border bg-background px-1 py-0.5"
                              value={r.cliente}
                              onChange={(e) => patchRow(idx, { cliente: e.target.value })}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="date"
                              className="rounded border border-border bg-background px-1 py-0.5"
                              value={r.fecha}
                              onChange={(e) => patchRow(idx, { fecha: e.target.value })}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              className="w-16 rounded border border-border bg-background px-1 py-0.5"
                              value={r.factura}
                              onChange={(e) => patchRow(idx, { factura: e.target.value })}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              step="0.01"
                              className="w-16 rounded border border-border bg-background px-1 py-0.5 text-right"
                              value={r.kilos}
                              onChange={(e) => patchRow(idx, { kilos: Number(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              step="0.01"
                              className="w-20 rounded border border-border bg-background px-1 py-0.5 text-right"
                              value={r.venta}
                              onChange={(e) => patchRow(idx, { venta: Number(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              className="w-28 rounded border border-border bg-background px-1 py-0.5"
                              value={r.lugar}
                              onChange={(e) => patchRow(idx, { lugar: e.target.value })}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              className="w-32 rounded border border-border bg-background px-1 py-0.5"
                              value={r.vendedor}
                              onChange={(e) => patchRow(idx, { vendedor: e.target.value })}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <button
                              title="Quitar fila"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                setEditRows((rows) => rows.filter((_, i) => i !== idx))
                              }
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Total kilos: <strong className="text-foreground">{editKilos.toFixed(2)}</strong> ·
                  Total venta: <strong className="text-foreground">{editVenta.toFixed(2)}</strong>
                </p>
              </div>

              <iframe title="Vista previa" src={preview} className="h-full w-full" />
            </div>
          </div>
        </div>
      )}
      <DespachosHechos />
    </div>
  );
}
