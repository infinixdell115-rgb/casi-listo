import { useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, EmptyState, Field, TextInput, inputClass } from "./ui";
import { useStore, type FacturaDb } from "@/lib/store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/excel";
import { isViveres } from "@/lib/types";
import { ordenarPorCorrelativo, useFacturasTodas } from "@/lib/facturas";
import { buildListaFacturasPdf, estadoFactura } from "@/lib/reportesPdf";
import { buildListaFacturasExcel } from "@/lib/excel";
import { saveReporte } from "@/lib/desktop";

const uniq = (l: string[]) => Array.from(new Set(l.filter(Boolean))).sort();

export function ListaFacturas() {
  const { user } = useStore();
  const { lista, cargando, recargar } = useFacturasTodas();
  const puedeEditar = user.esAdmin || (user.modulos as string[]).includes("facturas_editar");
  const puedeBorrar = user.esAdmin || (user.modulos as string[]).includes("facturas_eliminar");

  const [fVend, setFVend] = useState("");
  const [fCliente, setFCliente] = useState("");
  const [fNum, setFNum] = useState("");
  const [fZona, setFZona] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tipo, setTipo] = useState<"" | "viveres" | "normal">("");
  const [verAnuladas, setVerAnuladas] = useState(false);
  const [edit, setEdit] = useState<FacturaDb | null>(null);

  const vendedores = useMemo(() => uniq(lista.map((f) => f.vendedor)), [lista]);
  const zonas = useMemo(() => uniq(lista.map((f) => f.lugar)), [lista]);

  const filtradas = useMemo(() => {
    const c = fCliente.trim().toLowerCase();
    const n = fNum.trim().toLowerCase();
    return lista.filter((f) => {
      const fecha = f.fecha || "";
      return (
        (verAnuladas || !f.anulada) &&
        (!fVend || f.vendedor === fVend) &&
        (!fZona || f.lugar === fZona) &&
        (!c || f.cliente.toLowerCase().includes(c)) &&
        (!n || f.factura.toLowerCase().includes(n)) &&
        (!desde || (fecha && fecha >= desde)) &&
        (!hasta || (fecha && fecha <= hasta)) &&
        (!tipo || (tipo === "viveres") === isViveres(f.vendedor))
      );
    });
  }, [lista, fVend, fZona, fCliente, fNum, desde, hasta, tipo, verAnuladas]);

  const totalKilos = filtradas.reduce((a, f) => a + (f.anulada ? 0 : f.kilos || 0), 0);
  const totalVenta = filtradas.reduce((a, f) => a + (f.anulada ? 0 : f.venta || 0), 0);

  const borrar = async (f: FacturaDb) => {
    if (!confirm(`¿Eliminar definitivamente la factura ${f.factura} de ${f.cliente}?`)) return;
    try {
      await api(`/api/facturas/${f.id}`, { method: "DELETE" });
      toast.success("Factura eliminada.");
      void recargar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const exportar = async (formato: "pdf" | "xlsx") => {
    try {
      const rows = ordenarPorCorrelativo(filtradas);
      const partes = [
        desde || hasta ? `Del ${desde ? formatDate(desde) : "inicio"} al ${hasta ? formatDate(hasta) : "hoy"}` : "Todas las fechas",
        fVend && `Vendedor: ${fVend}`, fZona && `Zona: ${fZona}`, fCliente && `Cliente: ${fCliente}`,
      ].filter(Boolean);
      const periodo = partes.join(" · ");
      const hoy = new Date().toLocaleDateString("en-CA");
      const data = formato === "pdf"
        ? await buildListaFacturasPdf(rows, periodo)
        : await buildListaFacturasExcel(rows.map((r) => ({ ...r, estado: estadoFactura(r) })), periodo);
      const ruta = await saveReporte(`Lista_facturas_${hoy}_${Date.now() % 100000}.${formato}`, data);
      toast.success(`Guardado en: ${ruta}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const limpiar = () => {
    setFVend(""); setFCliente(""); setFNum(""); setFZona(""); setDesde(""); setHasta(""); setTipo("");
  };

  return (
    <Card title="Lista de facturas" badge={<Badge>{filtradas.length} facturas</Badge>}>
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Vendedor">
          <select className={inputClass} value={fVend} onChange={(e) => setFVend(e.target.value)}>
            <option value="">Todos</option>
            {vendedores.map((v) => <option key={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Cliente"><TextInput value={fCliente} placeholder="Buscar cliente" onChange={(e) => setFCliente(e.target.value)} /></Field>
        <Field label="N° de factura"><TextInput value={fNum} placeholder="Número" onChange={(e) => setFNum(e.target.value)} /></Field>
        <Field label="Zona">
          <select className={inputClass} value={fZona} onChange={(e) => setFZona(e.target.value)}>
            <option value="">Todas</option>
            {zonas.map((v) => <option key={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Fecha desde"><TextInput type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
        <Field label="Fecha hasta"><TextInput type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
        <Field label="Tipo">
          <select className={inputClass} value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="">Todas</option>
            <option value="normal">Solo normales</option>
            <option value="viveres">Solo víveres</option>
          </select>
        </Field>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={verAnuladas} onChange={(e) => setVerAnuladas(e.target.checked)} /> Ver anuladas
          </label>
          <Button variant="outline" onClick={limpiar}>Limpiar</Button>
          <Button variant="outline" disabled={filtradas.length === 0} onClick={() => void exportar("pdf")}><FileDown className="size-4" />PDF</Button>
          <Button variant="outline" disabled={filtradas.length === 0} onClick={() => void exportar("xlsx")}><FileSpreadsheet className="size-4" />Excel</Button>
        </div>
      </div>

      <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
        <span>Kilos: <strong className="text-foreground">{totalKilos.toFixed(2)}</strong></span>
        <span>Venta: <strong className="text-foreground">${totalVenta.toFixed(2)}</strong></span>
      </div>

      {cargando ? (
        <EmptyState>Cargando…</EmptyState>
      ) : filtradas.length === 0 ? (
        <EmptyState>No hay facturas para esos filtros.</EmptyState>
      ) : (
        <div className="mt-3 max-h-[32rem] overflow-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">Factura</th>
                <th className="px-2 py-2 text-left">Cliente</th>
                <th className="px-2 py-2 text-left">Fecha</th>
                <th className="px-2 py-2 text-left">Día</th>
                <th className="px-2 py-2 text-right">Kilos / Cajas</th>
                <th className="px-2 py-2 text-right">Venta</th>
                <th className="px-2 py-2 text-left">Zona</th>
                <th className="px-2 py-2 text-left">Vendedor</th>
                {user.esAdmin && <th className="px-2 py-2 text-left">Registró</th>}
                {(puedeEditar || puedeBorrar) && <th />}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => (
                <tr key={f.id} className={`border-b border-border/60 ${f.anulada ? "text-muted-foreground line-through" : ""}`}>
                  <td className="px-2 py-1.5 font-semibold">{f.factura}</td>
                  <td className="px-2 py-1.5">{f.cliente}</td>
                  <td className="px-2 py-1.5">{formatDate(f.fecha)}</td>
                  <td className="px-2 py-1.5">{f.sheet}</td>
                  <td className="px-2 py-1.5 text-right">{f.diario ? `${f.cajas || 0} cj / ${f.und || 0} und` : f.kilos.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right">{f.venta.toFixed(2)}</td>
                  <td className="px-2 py-1.5">{f.lugar}</td>
                  <td className="px-2 py-1.5">{f.vendedor}</td>
                  {user.esAdmin && <td className="px-2 py-1.5">{f.creadoPor || "—"}</td>}
                  {(puedeEditar || puedeBorrar) && (
                    <td className="whitespace-nowrap px-2 py-1.5 text-right">
                      {puedeEditar && (
                        <button className="mr-2 text-muted-foreground hover:text-primary" aria-label="Editar" onClick={() => setEdit(f)}>
                          <Pencil className="size-4" />
                        </button>
                      )}
                      {puedeBorrar && (
                        <button className="text-muted-foreground hover:text-destructive" aria-label="Eliminar" onClick={() => void borrar(f)}>
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <EditarFactura
          f={edit}
          vendedores={vendedores}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); void recargar(); }}
        />
      )}
    </Card>
  );
}

function EditarFactura({ f, vendedores, onClose, onSaved }: { f: FacturaDb; vendedores: string[]; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState({
    cliente: f.cliente, fecha: f.fecha, factura: f.factura, lugar: f.lugar, vendedor: f.vendedor,
    kilos: String(f.kilos ?? ""), venta: String(f.venta ?? ""), cajas: String(f.cajas ?? ""), und: String(f.und ?? ""),
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof d, v: string) => setD((p) => ({ ...p, [k]: v }));
  const n = (v: string) => parseFloat(v.replace(",", ".")) || 0;
  const guardar = async () => {
    if (!d.cliente.trim() || !d.factura.trim()) { toast.error("Cliente y número de factura son obligatorios."); return; }
    setSaving(true);
    try {
      await api(`/api/facturas/${f.id}`, {
        method: "PUT",
        body: {
          cliente: d.cliente.trim().toUpperCase(), fecha: d.fecha, factura: d.factura.trim(),
          lugar: d.lugar.trim().toUpperCase(), vendedor: d.vendedor.trim().toUpperCase(),
          kilos: n(d.kilos), venta: n(d.venta),
          ...(f.diario ? { cajas: n(d.cajas), und: n(d.und) } : {}),
        },
      });
      toast.success("Factura actualizada.");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setSaving(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-6" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-lg bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-sm font-semibold uppercase">Editar factura {f.factura}</span>
          <Button variant="ghost" onClick={onClose}><X className="size-4" /></Button>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <Field label="Cliente" className="md:col-span-2"><TextInput value={d.cliente} onChange={(e) => set("cliente", e.target.value)} /></Field>
          <Field label="N° factura"><TextInput value={d.factura} onChange={(e) => set("factura", e.target.value)} /></Field>
          <Field label="Fecha"><TextInput type="date" value={d.fecha} onChange={(e) => set("fecha", e.target.value)} /></Field>
          <Field label="Zona"><TextInput value={d.lugar} onChange={(e) => set("lugar", e.target.value)} /></Field>
          <Field label="Vendedor">
            <select className={inputClass} value={d.vendedor} onChange={(e) => set("vendedor", e.target.value)}>
              {!vendedores.includes(d.vendedor) && <option value={d.vendedor}>{d.vendedor}</option>}
              {vendedores.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          {f.diario ? (
            <>
              <Field label="Cajas"><TextInput value={d.cajas} onChange={(e) => set("cajas", e.target.value)} /></Field>
              <Field label="Unidades"><TextInput value={d.und} onChange={(e) => set("und", e.target.value)} /></Field>
            </>
          ) : (
            <Field label="Kilos"><TextInput value={d.kilos} onChange={(e) => set("kilos", e.target.value)} /></Field>
          )}
          <Field label="Venta ($)"><TextInput value={d.venta} onChange={(e) => set("venta", e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving} onClick={() => void guardar()}>Guardar cambios</Button>
        </div>
      </div>
    </div>
  );
}
