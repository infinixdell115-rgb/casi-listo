import { useNotasCredito } from "@/lib/notaCredito";
import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Pencil, Printer, Scale, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import type { Checklist, ChecklistDatos } from "@/lib/types";
import { Button, Card, ComboInput, Field, TextInput, inputClass } from "@/components/app/ui";
import { agrupar, aplanar, aplicarNotas, filtrar, type FilaProducto, type Grupo } from "@/lib/checklistStats";
import { buildReporteProductosPdf } from "@/lib/checklistReportePdf";
import { printPdf } from "@/lib/desktop";

const kilosDe = (d?: ChecklistDatos) =>
  (d?.items ?? []).reduce((acc, it) => acc + (parseFloat(it.peso ?? "") || 0), 0);

const totalKilos = (c: Checklist) => kilosDe(c) + kilosDe(c.segundo);

/** Modal para anotar los kilos (peso) de cada ítem del checklist. */
export function ChecklistKilos({
  checklist,
  onClose,
  onSave,
}: {
  checklist: Checklist;
  onClose: () => void;
  onSave: (c: Checklist) => Promise<void> | void;
}) {
  const [form, setForm] = useState<Checklist>(checklist);
  const [lado, setLado] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const { invoices } = useStore();
  const correlativos = useMemo(() => invoices.map((i) => i.factura).filter(Boolean), [invoices]);

  const actual: ChecklistDatos = lado === 1 ? form : (form.segundo ?? { ...form, items: [] });
  const setFactura = (v: string) =>
    setForm((f): Checklist =>
      lado === 1 ? { ...f, factura: v } : f.segundo ? { ...f, segundo: { ...f.segundo, factura: v } } : f,
    );
  const setPeso = (i: number, v: string) =>
    setForm((f): Checklist => {
      if (lado === 1) return { ...f, items: f.items.map((it, j) => (j === i ? { ...it, peso: v } : it)) };
      if (!f.segundo) return f;
      return { ...f, segundo: { ...f.segundo, items: f.segundo.items.map((it, j) => (j === i ? { ...it, peso: v } : it)) } };
    });

  const guardar = async () => {
    setSaving(true);
    try {
      const hayKilos = totalKilos(form) > 0;
      const rec: Checklist = { ...form, estado: hayKilos ? "completado" : "pendiente" };
      if (hayKilos) rec.completadoEn = form.completadoEn ?? new Date().toISOString();
      else delete rec.completadoEn;
      await onSave(rec);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-6" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-2xl flex-col rounded-lg bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase">
            <Scale className="size-4" /> Anotar kilos y factura · {form.cliente}
          </span>
          <Button variant="ghost" onClick={onClose}><X className="size-4" /></Button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {form.segundo && (
            <div className="mb-4 flex gap-2">
              {([1, 2] as const).map((n) => (
                <Button key={n} variant={lado === n ? "primary" : "outline"} onClick={() => setLado(n)}>
                  {n === 1 ? "Primer checklist" : "Segundo checklist"}
                </Button>
              ))}
            </div>
          )}
          <Field label="Factura (correlativo) — se asocia después de anotar los kilos" className="mb-4">
            <ComboInput
              options={correlativos}
              value={actual.factura ?? ""}
              placeholder="N° de factura"
              onChange={(e) => setFactura(e.target.value)}
            />
          </Field>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-muted-foreground">
                <th className="w-20 pb-2">Cant</th>
                <th className="pb-2">Descripción</th>
                <th className="w-28 pb-2">Kilos</th>
              </tr>
            </thead>
            <tbody>
              {actual.items.map((it, i) =>
                !it.descripcion && !it.cant ? null : (
                  <tr key={i}>
                    <td className="pr-2 pb-1.5 text-muted-foreground">{it.cant}</td>
                    <td className="pr-2 pb-1.5">{it.descripcion}</td>
                    <td className="pb-1.5">
                      <TextInput
                        value={it.peso ?? ""}
                        onChange={(e) => setPeso(i, e.target.value)}
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border p-3">
          <span className="text-sm text-muted-foreground">
            Total: <strong className="text-foreground">{totalKilos(form).toFixed(2)} kg</strong>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button disabled={saving} onClick={() => void guardar()}>Guardar kilos</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type Tab = "productos" | "clientes" | "vendedores" | "zonas" | "detalle";

function Ranking({ filas, etiqueta }: { filas: Grupo[]; etiqueta: string }) {
  if (filas.length === 0) return <p className="p-3 text-sm text-muted-foreground">Sin datos.</p>;
  const max = filas[0]?.kilos || 1;
  return (
    <div className="max-h-96 overflow-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted text-left text-[11px] uppercase">
          <tr><th className="p-2 w-10">#</th><th className="p-2">{etiqueta}</th><th className="p-2 text-right">Veces</th><th className="p-2 text-right">Kilos</th><th className="p-2 text-right w-20">%</th></tr>
        </thead>
        <tbody>
          {filas.map((g, i) => (
            <tr key={g.nombre} className="border-t border-border">
              <td className="p-2 text-muted-foreground">{i + 1}</td>
              <td className="p-2">
                <div className="font-medium">{g.nombre}</div>
                <div className="mt-1 h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-primary" style={{ width: `${(g.kilos / max) * 100}%` }} /></div>
              </td>
              <td className="p-2 text-right">{g.veces}</td>
              <td className="p-2 text-right font-semibold">{g.kilos.toFixed(2)}</td>
              <td className="p-2 text-right">{g.pct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Destacado({ titulo, mas, menos }: { titulo: string; mas: Grupo | undefined; menos: Grupo | undefined }) {
  return (
    <div className="rounded-md border border-border p-3 text-sm">
      <div className="text-[11px] font-semibold uppercase text-muted-foreground">{titulo}</div>
      <div className="mt-1 flex items-center gap-1"><TrendingUp className="size-4 text-primary" />Más: <strong>{mas?.nombre ?? "—"}</strong>{mas && ` (${mas.kilos.toFixed(2)} kg)`}</div>
      <div className="flex items-center gap-1"><TrendingDown className="size-4 text-destructive" />Menos: <strong>{menos?.nombre ?? "—"}</strong>{menos && ` (${menos.kilos.toFixed(2)} kg)`}</div>
    </div>
  );
}

/** Reporte de kilos por producto, cliente y vendedor a partir de los checklist con kilos de almacén. */
export function ChecklistReporte({ lista, onUpdate }: { lista: Checklist[]; onUpdate: (c: Checklist) => Promise<void> }) {
  const [zona, setZona] = useState("");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [eProd, setEProd] = useState("");
  const [eKilos, setEKilos] = useState("");
  const keyDe = (r: FilaProducto) => `${r.checklistId}-${r.lado}-${r.idx}`;

  /** Cambia o quita un ítem del checklist original. */
  const cambiarItem = async (r: FilaProducto, cambio: { descripcion: string; peso: string } | null) => {
    const c = lista.find((x) => x.id === r.checklistId);
    if (!c || r.idx == null) return;
    const mod = (items: Checklist["items"]) =>
      cambio
        ? items.map((it, j) => (j === r.idx ? { ...it, ...cambio } : it))
        : items.map((it, j) => (j === r.idx ? { cant: "", descripcion: "", peso: "" } : it));
    const nuevo: Checklist =
      r.lado === 2 && c.segundo ? { ...c, segundo: { ...c.segundo, items: mod(c.segundo.items) } } : { ...c, items: mod(c.items) };
    await onUpdate(nuevo);
    setEditKey(null);
  };
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [vend, setVend] = useState("");
  const [tab, setTab] = useState<Tab>("productos");
  const [abierto, setAbierto] = useState<string | null>(null);

  const notas = useNotasCredito();
  const todas = useMemo(() => aplicarNotas(aplanar(lista), notas), [lista, notas]);
  const vendedores = useMemo(() => agrupar(todas, "vendedor").map((g) => g.nombre).sort(), [todas]);
  const zonas = useMemo(() => agrupar(todas, "zona").map((g) => g.nombre).sort(), [todas]);
  const filas = useMemo(() => filtrar(todas, desde, hasta, vend, zona), [todas, desde, hasta, vend, zona]);
  const porZona = useMemo(() => agrupar(filas, "zona"), [filas]);
  const productos = useMemo(() => agrupar(filas, "producto"), [filas]);
  const clientes = useMemo(() => agrupar(filas, "cliente"), [filas]);
  const porVendedor = useMemo(() => agrupar(filas, "vendedor"), [filas]);
  const total = filas.reduce((a, r) => a + r.kilos, 0);
  const pendientes = lista.filter((c) => (c.estado ?? "pendiente") === "pendiente").length;

  const imprimir = async () => {
    const sub = `${desde || "inicio"} a ${hasta || "hoy"} · Vendedor: ${vend || "todos"} · Zona: ${zona || "todas"}`;
    const bytes = await buildReporteProductosPdf({
      subtitulo: sub,
      total,
      secciones: [
        { titulo: "PRODUCTOS", filas: productos },
        { titulo: "CLIENTES", filas: clientes },
        ...(vend ? [] : [{ titulo: "VENDEDORES", filas: porVendedor }]),
        ...(zona ? [] : [{ titulo: "ZONAS", filas: porZona }]),
        ...(zona
          ? []
          : porZona.map((z) => ({
              titulo: `ZONA: ${z.nombre} — PRODUCTOS (${z.kilos.toFixed(2)} kg)`,
              filas: agrupar(filas.filter((r) => r.zona === z.nombre), "producto"),
            }))),
      ],
    });
    await printPdf(bytes);
  };

  return (
    <Card title="Reporte de kilos por producto">
      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Field label="Desde"><input type="date" className={inputClass} value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
        <Field label="Hasta"><input type="date" className={inputClass} value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
        <Field label="Vendedor">
          <select className={inputClass} value={vend} onChange={(e) => setVend(e.target.value)}>
            <option value="">Todos</option>
            {vendedores.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Zona">
          <select className={inputClass} value={zona} onChange={(e) => setZona(e.target.value)}>
            <option value="">Todas</option>
            {zonas.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <div className="flex items-end"><Button variant="outline" disabled={!filas.length} onClick={() => void imprimir()}><Printer className="size-4" />Imprimir reporte</Button></div>
      </div>

      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        <span>Total: <strong>{total.toFixed(2)} kg</strong></span>
        <span className="text-muted-foreground">{productos.length} productos · {clientes.length} clientes</span>
        {pendientes > 0 && <span className="text-muted-foreground">{pendientes} checklist pendientes de kilos (no cuentan)</span>}
      </div>

      {filas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay checklist con kilos anotados en este filtro.</p>
      ) : (
        <>
          <div className="mb-3 grid gap-3 md:grid-cols-3">
            <Destacado titulo="Producto" mas={productos[0]} menos={productos[productos.length - 1]} />
            <Destacado titulo="Cliente" mas={clientes[0]} menos={clientes[clientes.length - 1]} />
            <Destacado titulo="Zona" mas={porZona[0]} menos={porZona[porZona.length - 1]} />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {(["productos", "clientes", "vendedores", "zonas", "detalle"] as Tab[]).map((t) => (
              <Button key={t} variant={tab === t ? "primary" : "outline"} onClick={() => setTab(t)}>{t === "detalle" ? "Detalle (editar / eliminar)" : t.charAt(0).toUpperCase() + t.slice(1)}</Button>
            ))}
          </div>
          {tab === "productos" && <Ranking filas={productos} etiqueta="Producto" />}
          {tab === "clientes" && <Ranking filas={clientes} etiqueta="Cliente" />}
          {tab === "zonas" && (
            <div className="space-y-2">
              {porZona.map((z) => {
                const sus = filas.filter((r) => r.zona === z.nombre);
                const sp = agrupar(sus, "producto");
                const sc = agrupar(sus, "cliente");
                const open = abierto === z.nombre;
                return (
                  <div key={z.nombre} className="rounded-md border border-border">
                    <button className="flex w-full items-center justify-between p-3 text-left text-sm" onClick={() => setAbierto(open ? null : z.nombre)}>
                      <span className="flex items-center gap-2 font-semibold">{open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}{z.nombre}</span>
                      <span className="text-muted-foreground">Más vendido: <strong className="text-foreground">{sp[0]?.nombre}</strong> · Menos vendido: <strong className="text-foreground">{sp[sp.length - 1]?.nombre}</strong> · <strong className="text-foreground">{z.kilos.toFixed(2)} kg</strong></span>
                    </button>
                    {open && (
                      <div className="grid gap-3 border-t border-border p-3 md:grid-cols-2">
                        <Ranking filas={sp} etiqueta="Producto" />
                        <Ranking filas={sc} etiqueta="Cliente" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {tab === "vendedores" && (
            <div className="space-y-2">
              {porVendedor.map((v) => {
                const sus = filas.filter((r) => r.vendedor === v.nombre);
                const sp = agrupar(sus, "producto");
                const sc = agrupar(sus, "cliente");
                const open = abierto === v.nombre;
                return (
                  <div key={v.nombre} className="rounded-md border border-border">
                    <button className="flex w-full items-center justify-between p-3 text-left text-sm" onClick={() => setAbierto(open ? null : v.nombre)}>
                      <span className="flex items-center gap-2 font-semibold">{open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}{v.nombre}</span>
                      <span className="text-muted-foreground">Top producto: <strong className="text-foreground">{sp[0]?.nombre}</strong> · Mejor cliente: <strong className="text-foreground">{sc[0]?.nombre}</strong> · <strong className="text-foreground">{v.kilos.toFixed(2)} kg</strong></span>
                    </button>
                    {open && (
                      <div className="grid gap-3 border-t border-border p-3 md:grid-cols-2">
                        <Ranking filas={sp} etiqueta="Producto" />
                        <Ranking filas={sc} etiqueta="Cliente" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {tab === "detalle" && (
            <div className="max-h-96 overflow-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-left text-[11px] uppercase">
                  <tr><th className="p-2">Fecha</th><th className="p-2">Cliente</th><th className="p-2">Zona</th><th className="p-2">Vendedor</th><th className="p-2">Producto</th><th className="p-2 text-right">Kilos</th><th className="p-2 w-20" /></tr>
                </thead>
                <tbody>
                  {filas.map((r) => {
                    const k = keyDe(r);
                    const editando = editKey === k;
                    return (
                      <tr key={k} className="border-t border-border">
                        <td className="p-2">{r.fecha.split("-").reverse().join("/")}</td><td className="p-2">{r.cliente}</td><td className="p-2">{r.zona}</td>
                        <td className="p-2">{r.vendedor}</td>
                        <td className="p-2">{editando ? <TextInput className="h-8" value={eProd} onChange={(e) => setEProd(e.target.value)} /> : r.producto}</td>
                        <td className="p-2 text-right font-semibold">{editando ? <TextInput className="h-8 w-24 text-right" value={eKilos} onChange={(e) => setEKilos(e.target.value)} /> : r.kilos.toFixed(2)}</td>
                        <td className="whitespace-nowrap p-2 text-right">
                          {editando ? (
                            <>
                              <button aria-label="Guardar" className="mr-2 text-primary" onClick={() => void cambiarItem(r, { descripcion: eProd, peso: eKilos })}><Check className="size-4" /></button>
                              <button aria-label="Cancelar" className="text-muted-foreground" onClick={() => setEditKey(null)}><X className="size-4" /></button>
                            </>
                          ) : (
                            <>
                              <button aria-label="Editar" className="mr-2 text-muted-foreground hover:text-primary" onClick={() => { setEditKey(k); setEProd(r.producto); setEKilos(String(r.kilos)); }}><Pencil className="size-4" /></button>
                              <button aria-label="Eliminar" className="text-muted-foreground hover:text-destructive" onClick={() => { if (confirm(`¿Quitar ${r.producto} (${r.kilos} kg) de ${r.cliente}?`)) void cambiarItem(r, null); }}><Trash2 className="size-4" /></button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
