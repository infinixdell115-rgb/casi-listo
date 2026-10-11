import { useEffect, useMemo, useState } from "react";
import { listChecklists } from "@/lib/desktop";
import { normalizar } from "@/lib/checklistStats";
import type { NotaCreditoItem } from "@/lib/notaCredito";
import type { FacturaDb } from "@/lib/store";
import type { Checklist } from "@/lib/types";
import { toast } from "sonner";
import { Badge, Button, Card, EmptyState, Field, TextInput, inputClass } from "./ui";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/excel";

export function Novedades() {
  const { invoices, todas, sidecar, setNovedad, removeNovedad } = useStore();
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
    const inv = invoices.find((i) => i.id === id) as FacturaDb | undefined;
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
    const inv = invoices.find((i) => i.id === facturaSel);
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
    toast.success("Novedad guardada.");
  };

  return (
    <div className="flex flex-col gap-5">
      <Card title="Registrar novedad">
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
                    <td className="px-2 py-2 whitespace-pre-wrap">
                      {(() => {
                        const f = todas.find((x) => x.factura === n.factura && x.notaCredito);
                        return f?.notaCredito ? <Badge>NC {(f.notaCredito.kilos_recibidos - f.kilosFacturados).toFixed(2)} kg</Badge> : null;
                      })()} {n.texto}
                    </td>
                    <td className="px-2 py-2">{formatDate(n.fecha)}</td>
                    <td className="px-2 py-2 text-right">
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
    </div>
  );
}
