import { useMemo, useState } from "react";
import { Badge, Card, Field, TextInput } from "./ui";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/excel";

export function Carpeta() {
  const { invoices, sidecar, toggleCarpeta } = useStore();
  const [buscar, setBuscar] = useState("");
  const [soloCarpeta, setSoloCarpeta] = useState(false);

  const lista = useMemo(() => {
    const q = buscar.trim().toUpperCase();
    return invoices.filter((i) => {
      const match =
        !q ||
        i.cliente.toUpperCase().includes(q) ||
        i.vendedor.toUpperCase().includes(q) ||
        i.factura.toUpperCase().includes(q);
      return match && (!soloCarpeta || sidecar.enCarpeta.includes(i.factura));
    });
  }, [invoices, buscar, soloCarpeta, sidecar.enCarpeta]);

  return (
    <Card
      title="Facturas en carpeta"
      badge={<Badge>{sidecar.enCarpeta.length} en carpeta</Badge>}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Buscar por cliente, vendedor o factura">
          <TextInput value={buscar} placeholder="Buscar…" onChange={(e) => setBuscar(e.target.value)} />
        </Field>
        <label className="mt-6 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={soloCarpeta}
            onChange={(e) => setSoloCarpeta(e.target.checked)}
          />
          Mostrar solo las que ya están en carpeta
        </label>
      </div>

      <div className="mt-4 max-h-[28rem] overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left">En carpeta</th>
              <th className="px-2 py-2 text-left">Factura</th>
              <th className="px-2 py-2 text-left">Cliente</th>
              <th className="px-2 py-2 text-left">Fecha</th>
              <th className="px-2 py-2 text-left">Vendedor</th>
              <th className="px-2 py-2 text-left">Novedad</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((i) => {
              const novedad = sidecar.novedades[i.factura];
              return (
                <tr key={i.id} className="border-b border-border/60">
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={sidecar.enCarpeta.includes(i.factura)}
                      onChange={() => toggleCarpeta(i.factura)}
                    />
                  </td>
                  <td className="px-2 py-1.5">{i.factura}</td>
                  <td className="px-2 py-1.5">{i.cliente}</td>
                  <td className="px-2 py-1.5">{formatDate(i.fecha)}</td>
                  <td className="px-2 py-1.5">{i.vendedor}</td>
                  <td className="px-2 py-1.5">
                    {novedad ? (
                      <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                        Con novedad
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin novedad</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {lista.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-muted-foreground">
                  No hay facturas para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
