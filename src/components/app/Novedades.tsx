import { useEffect, useMemo, useState } from "react";
import { listChecklists } from "@/lib/desktop";
import { normalizar } from "@/lib/checklistStats";
import type { NotaCreditoItem } from "@/lib/notaCredito";
import type { FacturaDb } from "@/lib/store";
import type { Checklist } from "@/lib/types";
import { toast } from "sonner";
import { Eye, X } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, TextInput, inputClass } from "./ui";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/excel";

export function Novedades() {
  const { invoices: invSemana, todas, sidecar, setNovedad, removeNovedad, user } = useStore();
  const puedeEditarNov = user.esAdmin || (user.modulos as string[]).includes("novedades_editar");
  const [ver, setVer] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const invoices = useMemo(() => {
    if (!editando || invSemana.some((i) => i.id === editando)) return invSemana;
    const extra = todas.find((i) => i.id === editando);
    return extra ? [extra, ...invSemana] : invSemana;
  }, [invSemana, todas, editando]);
  const [facturaSel, setFacturaSel] = useState("");
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<"normal" | "nc">("normal");
  const [items, setItems] = useState<NotaCreditoItem[]>([]);
  const [recibidoTotal, setRecibidoTotal] = useState("");
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  useEffect(() => { void listChecklists().then(setChecklists); }, []);
  const num = (v: string | number) => parseFloat(String(v).replace(",", ".")) || 0;

  /** Productos con kilos de los checklist ligados a esa factura. */
  const productosDe = (factura: string): NotaCreditoItem[] => {
    const m = new Map<string, NotaCreditoItem>();
    for (const c of checklists) {
      for (const d of [c, c.segundo]) {
        if (!d || (d.factura ?? "").trim() !== factura.trim()) continue;
        for (const it of d.items ?? []) {
          const k = num(it.peso ?? "");
          if (!it.descripcion?.trim() || k <= 0) continue;
          const key = normalizar(it.descripcion);
          const prev = m.get(key);
          if (prev) { prev.facturado += k; prev.recibido += k; }
          else m.set(key, { producto: it.descripcion.trim().toUpperCase(), facturado: k, recibido: k });
        }
      }
    }
    return [...m.values()];
  };

  const elegir = (id: string) => {
    setFacturaSel(id);
    const inv = (invoices.find((i) => i.id === id) ?? todas.find((i) => i.id === id)) as FacturaDb | undefined;
    setTexto(inv ? (sidecar.novedades[inv.factura]?.texto ?? "") : "");
    const nc = inv?.notaCredito;
    setTipo(nc ? "nc" : "normal");
    setItems(nc?.items?.length ? nc.items : inv ? productosDe(inv.factura) : []);
    setRecibidoTotal(nc ? String(nc.kilos_recibidos) : inv ? String(inv.kilosFacturados ?? inv.kilos) : "");
  };
  const invSel = invoices.find((i) => i.id === facturaSel) as FacturaDb | undefined;
  const facturado = invSel ? (invSel.kilosFacturados ?? invSel.kilos) : 0;
  // Con checklist: kilos de la factura menos la suma de las diferencias por producto.
  const recibido = items.length
    ? Math.max(0, facturado - items.reduce((s, i) => s + Math.max(0, i.facturado - i.recibido), 0))
    : num(recibidoTotal);
  const [buscar, setBuscar] = useState("");

  const lista = useMemo(() => {
    const q = buscar.trim().toUpperCase();
    return Object.values(sidecar.novedades).filter(
      (n) =>
        !q ||
        n.cliente.toUpperCase().includes(q) ||
        n.vendedor.toUpperCase().includes(q) ||
        n.factura.toUpperCase().includes(q),
    );
  }, [sidecar.novedades, buscar]);

  const guardar = () => {
    const inv = invoices.find((i) => i.id === facturaSel) ?? todas.find((i) => i.id === facturaSel);
    if (!inv) {
      toast.error("Selecciona una factura.");
      return;
    }
    if (!texto.trim()) {
      toast.error("Escribe la novedad.");
      return;
    }
    const excedido = items.find((i) => i.recibido > i.facturado + 0.001);
    if (tipo === "nc" && excedido) {
      toast.error(`En ${excedido.producto} los kilos recibidos no pueden ser más que los facturados (${excedido.facturado.toFixed(2)}).`);
      return;
    }
    if (tipo === "nc" && !items.length && recibido > facturado + 0.001) {
      toast.error("Los kilos recibidos no pueden ser más que los facturados.");
      return;
    }
    setNovedad(inv, texto.trim(), tipo === "nc" ? { items, kilos_recibidos: Math.round(recibido * 100) / 100 } : null);
    setTexto("");
    setItems([]);
    setTipo("normal");
    setFacturaSel("");
    setEditando(null);
    toast.success("Novedad guardada.");
  };

  return (
    <div className="flex flex-col gap-5">
      <Card title={editando ? "Editar novedad" : "Registrar novedad"}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Factura">
            <select
              className={inputClass}
              value={facturaSel}
              onChange={(e) => elegir(e.target.value)}
            >
              <option value="">Selecciona una factura…</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.factura} — {i.cliente} ({i.vendedor})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de novedad">
            <select className={inputClass} value={tipo} onChange={(e) => setTipo(e.target.value as "normal" | "nc")}>
              <option value="normal">Normal</option>
              <option value="nc">Nota de crédito (el cliente recibió menos kilos)</option>
            </select>
          </Field>
          <Field label="Novedad">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              placeholder="¿Qué pasó con esta factura?"
              className={`${inputClass} h-auto py-2`}
            />
          </Field>
        </div>
        {tipo === "nc" && invSel && (
          <div className="mt-4 rounded-md border border-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Nota de crédito · factura {invSel.factura} · {facturado.toFixed(2)} kg facturados</p>
            {items.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="text-[11px] uppercase text-muted-foreground"><th className="p-1 text-left">Producto</th><th className="p-1 text-right">Facturado</th><th className="p-1 text-right">Recibió</th><th className="p-1 text-right">Diferencia</th></tr></thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.producto} className="border-t border-border/60">
                      <td className="p-1">{it.producto}</td>
                      <td className="p-1 text-right">{it.facturado.toFixed(2)}</td>
                      <td className="p-1 text-right">
                        <input className={`${inputClass} h-8 w-24 text-right`} defaultValue={it.recibido}
                          onChange={(e) => setItems((l) => l.map((x, j) => (j === idx ? { ...x, recibido: num(e.target.value) } : x)))} />
                      </td>
                      <td className="p-1 text-right text-destructive">{(it.recibido - it.facturado).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Field label="Esta factura no tiene checklist con kilos. Kilos totales que recibió el cliente">
                <TextInput value={recibidoTotal} onChange={(e) => setRecibidoTotal(e.target.value)} />
              </Field>
            )}
            <p className="mt-2 text-sm font-semibold">
              Nota de crédito: {(recibido - facturado).toFixed(2)} kg · Kilos de la factura: {recibido.toFixed(2)} kg
            </p>
          </div>
        )}
        <div className="mt-4">
          <Button onClick={guardar}>Guardar novedad</Button>
        </div>
      </Card>

      <Card title="Facturas con novedad" badge={<Badge>{lista.length}</Badge>}>
        <Field label="Buscar por cliente, vendedor o número de factura">
          <TextInput
            value={buscar}
            placeholder="Buscar…"
            onChange={(e) => setBuscar(e.target.value)}
          />
        </Field>
        {lista.length === 0 ? (
          <EmptyState>No hay facturas con novedad.</EmptyState>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                  <th className="px-2 py-2 text-left">Factura</th>
                  <th className="px-2 py-2 text-left">Cliente</th>
                  <th className="px-2 py-2 text-left">Vendedor</th>
                  <th className="px-2 py-2 text-left">Novedad</th>
                  <th className="px-2 py-2 text-left">Registrada</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.map((n) => (
                  <tr key={n.factura} className="border-b border-border/60 align-top">
                    <td className="px-2 py-2 font-medium">{n.factura}</td>
                    <td className="px-2 py-2">{n.cliente}</td>
                    <td className="px-2 py-2">{n.vendedor}</td>
                    <td className="px-2 py-2">
                      <Button variant="outline" onClick={() => setVer(n.factura)}><Eye className="size-4" />Previsualizar</Button>
                    </td>
                    <td className="px-2 py-2">{formatDate(n.fecha)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      {puedeEditarNov && (
                        <button className="mr-3 text-xs uppercase text-primary" onClick={() => {
                          const f = todas.find((x) => x.factura === n.factura && !x.anulada);
                          if (!f) { toast.error("No se encontró la factura."); return; }
                          setEditando(f.id);
                          elegir(f.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}>Editar</button>
                      )}
                      <button
                        className="text-xs uppercase text-destructive"
                        onClick={() => removeNovedad(n.factura)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {ver && (() => {
        const n = sidecar.novedades[ver];
        const f = todas.find((x) => x.factura === ver && !x.anulada) as FacturaDb | undefined;
        const nc = f?.notaCredito;
        const prods = nc?.items?.length ? nc.items : productosDe(ver);
        const tf = prods.reduce((s, p) => s + p.facturado, 0);
        const tr = prods.reduce((s, p) => s + p.recibido, 0);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setVer(null)}>
            <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-border bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-start gap-2">
                <div>
                  <p className="text-sm font-semibold">Factura {ver} · {n?.cliente}</p>
                  <p className="text-xs text-muted-foreground">{n?.vendedor}{f ? ` · ${f.lugar} · ${formatDate(f.fecha)} · ${(f.kilosFacturados ?? f.kilos).toFixed(2)} kg facturados` : ""}</p>
                </div>
                <button aria-label="Cerrar" className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => setVer(null)}><X className="size-5" /></button>
              </div>
              {prods.length ? (
                <table className="w-full text-sm">
                  <thead><tr className="text-[11px] uppercase text-muted-foreground"><th className="p-1 text-left">Producto</th><th className="p-1 text-right">Kilos checklist</th>{nc && <><th className="p-1 text-right">Recibió</th><th className="p-1 text-right">Diferencia</th></>}</tr></thead>
                  <tbody>
                    {prods.map((p) => (
                      <tr key={p.producto} className="border-t border-border/60">
                        <td className="p-1">{p.producto}</td>
                        <td className="p-1 text-right">{p.facturado.toFixed(2)}</td>
                        {nc && <><td className="p-1 text-right">{p.recibido.toFixed(2)}</td><td className="p-1 text-right text-destructive">{(p.recibido - p.facturado).toFixed(2)}</td></>}
                      </tr>
                    ))}
                    <tr className="border-t border-border font-semibold">
                      <td className="p-1">TOTAL</td><td className="p-1 text-right">{tf.toFixed(2)}</td>
                      {nc && <><td className="p-1 text-right">{tr.toFixed(2)}</td><td className="p-1 text-right text-destructive">{(tr - tf).toFixed(2)}</td></>}
                    </tr>
                  </tbody>
                </table>
              ) : <p className="text-sm text-muted-foreground">Esta factura no tiene checklist asociado.</p>}
              <div className="mt-4 rounded-md border border-border bg-muted/40 p-3">
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  {nc ? `Nota de crédito · ${(nc.kilos_recibidos - (f?.kilosFacturados ?? 0)).toFixed(2)} kg · kilos de la factura: ${Number(nc.kilos_recibidos).toFixed(2)}` : "Novedad"}
                </p>
                <p className="whitespace-pre-wrap text-sm">{n?.texto}</p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
