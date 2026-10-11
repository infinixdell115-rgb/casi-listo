import { useMemo, useState } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, EmptyState, Field, TextInput, inputClass } from "./ui";
import { useStore, type FacturaDb } from "@/lib/store";
import { formatDate } from "@/lib/excel";

export function Anulaciones() {
  const { invoices, anuladas, sidecar, anular, restaurar } = useStore();
  const [buscar, setBuscar] = useState("");
  const [objetivo, setObjetivo] = useState<FacturaDb | null>(null);
  const [motivo, setMotivo] = useState("");

  const match = (f: { factura: string; cliente: string; vendedor: string }) => {
    const q = buscar.trim().toUpperCase();
    return (
      !q ||
      f.factura.toUpperCase().includes(q) ||
      f.cliente.toUpperCase().includes(q) ||
      f.vendedor.toUpperCase().includes(q)
    );
  };
  const disponibles = useMemo(
    () => (invoices as FacturaDb[]).filter(match),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoices, buscar],
  );
  const listaAnuladas = useMemo(
    () => anuladas.filter(match),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anuladas, buscar],
  );

  const confirmar = async () => {
    if (!objetivo) return;
    if (!motivo.trim()) {
      toast.error("Escribe por qué se anula la factura.");
      return;
    }
    await anular(objetivo.id, motivo.trim());
    setObjetivo(null);
    setMotivo("");
  };

  return (
    <div className="flex flex-col gap-5">
      <Card title="Facturas disponibles" badge={<Badge>{disponibles.length}</Badge>}>
        <Field label="Buscar por número de factura, cliente o vendedor">
          <TextInput value={buscar} placeholder="Buscar…" onChange={(e) => setBuscar(e.target.value)} />
        </Field>
        <div className="mt-4 max-h-[26rem] overflow-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">Factura</th>
                <th className="px-2 py-2 text-left">Cliente</th>
                <th className="px-2 py-2 text-left">Vendedor</th>
                <th className="px-2 py-2 text-right">Kilos</th>
                <th className="px-2 py-2 text-right">Venta</th>
                <th className="px-2 py-2 text-left">Novedad</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {disponibles.map((f) => (
                <tr key={f.id} className="border-b border-border/60">
                  <td className="px-2 py-1.5 font-medium">{f.factura}</td>
                  <td className="px-2 py-1.5">{f.cliente}</td>
                  <td className="px-2 py-1.5">{f.vendedor}</td>
                  <td className="px-2 py-1.5 text-right">{f.kilos.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right">{f.venta.toFixed(2)}</td>
                  <td className="px-2 py-1.5">
                    {sidecar.novedades[f.factura] ? (
                      <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                        Con novedad
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin novedad</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Button variant="outline" onClick={() => { setObjetivo(f); setMotivo(""); }}>
                      <Ban className="size-4" /> Anular
                    </Button>
                  </td>
                </tr>
              ))}
              {disponibles.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-2 py-8 text-center text-muted-foreground">
                    No hay facturas para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Facturas anuladas" badge={<Badge>{listaAnuladas.length}</Badge>}>
        {listaAnuladas.length === 0 ? (
          <EmptyState>No hay facturas anuladas.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                  <th className="px-2 py-2 text-left">Factura</th>
                  <th className="px-2 py-2 text-left">Cliente</th>
                  <th className="px-2 py-2 text-left">Vendedor</th>
                  <th className="px-2 py-2 text-right">Kilos</th>
                  <th className="px-2 py-2 text-right">Venta</th>
                  <th className="px-2 py-2 text-left">Motivo</th>
                  <th className="px-2 py-2 text-left">Anulada</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {listaAnuladas.map((f) => (
                  <tr key={f.id} className="border-b border-border/60 align-top text-muted-foreground">
                    <td className="px-2 py-2 font-medium line-through">{f.factura}</td>
                    <td className="px-2 py-2">{f.cliente}</td>
                    <td className="px-2 py-2">{f.vendedor}</td>
                    <td className="px-2 py-2 text-right line-through">{f.kilos.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right line-through">{f.venta.toFixed(2)}</td>
                    <td className="px-2 py-2 whitespace-pre-wrap text-foreground">{f.anuladaMotivo}</td>
                    <td className="px-2 py-2 text-xs">
                      {f.anuladaEn ? formatDate(f.anuladaEn.slice(0, 10)) : ""}
                      <br />
                      {f.anuladaPor}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        className="inline-flex items-center gap-1 text-xs uppercase text-primary"
                        onClick={() => void restaurar(f.id)}
                      >
                        <RotateCcw className="size-3.5" /> Restaurar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {objetivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <h3 className="text-sm font-semibold uppercase">Anular factura {objetivo.factura}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {objetivo.cliente} · {objetivo.vendedor}. Sus kilos y su venta dejarán de sumar en los totales.
            </p>
            <Field label="¿Por qué se anula?" className="mt-4">
              <textarea
                autoFocus
                rows={4}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: monto mal escrito, se rehízo con otra factura…"
                className={`${inputClass} h-auto py-2`}
              />
            </Field>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setObjetivo(null)}>Cancelar</Button>
              <Button onClick={() => void confirmar()}><Ban className="size-4" /> Anular</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
