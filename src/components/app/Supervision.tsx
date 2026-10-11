import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge, Card } from "./ui";
import { api, escucharCambios } from "@/lib/api";
import { toFactura, type FacturaDb, type Row } from "@/lib/store";
import { filtrarFacturas, rangoDe } from "@/lib/filtros";
import { formatDate } from "@/lib/excel";
import { FiltroBar, filtroInicial, uniq } from "./FiltroBar";
import { DespachosHechos } from "./DespachosHechos";

type Tab = "facturas" | "anuladas" | "novedades" | "despachos";

export function Supervision() {
  const [tab, setTab] = useState<Tab>("facturas");
  const [todas, setTodas] = useState<FacturaDb[]>([]);
  const [f, setF] = useState(filtroInicial);

  useEffect(() => {
    const cargar = () =>
      void api<Row[]>("/api/supervision/facturas")
        .then((r) => setTodas(r.map(toFactura)))
        .catch((e) => toast.error((e as Error).message));
    cargar();
    return escucharCambios(cargar);
  }, []);

  const rango = rangoDe(f.periodo, new Date(), f.desde, f.hasta);
  const facturas = useMemo(() => filtrarFacturas(todas, { ...f, rango }), [todas, f, rango.desde, rango.hasta]);
  const novedades = useMemo(
    () =>
      todas.filter(
        (i) =>
          i.novedad &&
          filtrarFacturas([i], { ...f, usuario: "", rango: { desde: "", hasta: "" } }).length &&
          (!f.usuario || (i.novedadPor ?? "").toUpperCase() === f.usuario) &&
          (!rango.desde || (i.novedadFecha ?? "") >= rango.desde) &&
          (!rango.hasta || (i.novedadFecha ?? "") <= rango.hasta),
      ),
    [todas, f, rango.desde, rango.hasta],
  );
  const anuladas = useMemo(
    () =>
      todas.filter(
        (i) =>
          i.anulada &&
          filtrarFacturas([i], { ...f, usuario: "", rango }).length &&
          (!f.usuario || [i.creadoPor, i.anuladaPor ?? ""].some((x) => (x ?? "").toUpperCase() === f.usuario)),
      ),
    [todas, f, rango.desde, rango.hasta],
  );
  const usuarios = useMemo(() => uniq(todas.flatMap((i) => [i.creadoPor, i.novedadPor ?? "", i.anuladaPor ?? ""])), [todas]);
  const vendedores = useMemo(() => uniq(todas.map((i) => i.vendedor)), [todas]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "facturas", label: "Facturas" },
    { id: "anuladas", label: "Facturas anuladas" },
    { id: "novedades", label: "Novedades" },
    { id: "despachos", label: "Relaciones de despacho" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-2 text-xs font-semibold uppercase ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "despachos" ? (
        <DespachosHechos titulo="Relaciones de despacho de todos los usuarios" />
      ) : tab === "anuladas" ? (
        <Card title="Facturas anuladas por usuario" badge={<Badge>{anuladas.length}</Badge>}>
          <FiltroBar f={f} set={setF} usuarios={usuarios} vendedores={vendedores} />
          <div className="mt-4 max-h-[32rem] overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">Fecha</th>
                  <th className="px-2 py-2 text-left">Factura</th>
                  <th className="px-2 py-2 text-left">Cliente</th>
                  <th className="px-2 py-2 text-left">Vendedor</th>
                  <th className="px-2 py-2 text-right">Kilos</th>
                  <th className="px-2 py-2 text-left">Motivo</th>
                  <th className="px-2 py-2 text-left">Registrada por</th>
                  <th className="px-2 py-2 text-left">Anulada por</th>
                  <th className="px-2 py-2 text-left">Anulada el</th>
                </tr>
              </thead>
              <tbody>
                {anuladas.map((i) => (
                  <tr key={i.id} className="border-b border-border/60">
                    <td className="px-2 py-1.5">{formatDate(i.fecha)}</td>
                    <td className="px-2 py-1.5">{i.factura}</td>
                    <td className="px-2 py-1.5">{i.cliente}</td>
                    <td className="px-2 py-1.5">{i.vendedor}</td>
                    <td className="px-2 py-1.5 text-right">{i.kilosFacturados.toFixed(2)}</td>
                    <td className="px-2 py-1.5">{i.anuladaMotivo || "—"}</td>
                    <td className="px-2 py-1.5">{i.creadoPor || "—"}</td>
                    <td className="px-2 py-1.5 font-medium">{i.anuladaPor || "—"}</td>
                    <td className="px-2 py-1.5">{i.anuladaEn ? formatDate(i.anuladaEn.slice(0, 10)) : "—"}</td>
                  </tr>
                ))}
                {anuladas.length === 0 && (
                  <tr><td colSpan={9} className="px-2 py-8 text-center text-muted-foreground">No hay facturas anuladas para esos filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card
          title={tab === "facturas" ? "Facturas registradas por usuario" : "Novedades cargadas por usuario"}
          badge={<Badge>{tab === "facturas" ? facturas.length : novedades.length}</Badge>}
        >
          <FiltroBar f={f} set={setF} usuarios={usuarios} vendedores={vendedores} />
          <div className="mt-4 max-h-[32rem] overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-[11px] uppercase text-muted-foreground">
                {tab === "facturas" ? (
                  <tr>
                    <th className="px-2 py-2 text-left">Fecha</th>
                    <th className="px-2 py-2 text-left">Factura</th>
                    <th className="px-2 py-2 text-left">Cliente</th>
                    <th className="px-2 py-2 text-left">Vendedor</th>
                    <th className="px-2 py-2 text-right">Kilos</th>
                    <th className="px-2 py-2 text-right">Venta</th>
                    <th className="px-2 py-2 text-left">Registrado por</th>
                    <th className="px-2 py-2 text-left">Estado</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-2 py-2 text-left">Fecha</th>
                    <th className="px-2 py-2 text-left">Factura</th>
                    <th className="px-2 py-2 text-left">Cliente</th>
                    <th className="px-2 py-2 text-left">Vendedor</th>
                    <th className="px-2 py-2 text-left">Novedad</th>
                    <th className="px-2 py-2 text-left">Cargada por</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {tab === "facturas"
                  ? facturas.map((i) => (
                      <tr key={i.id} className="border-b border-border/60">
                        <td className="px-2 py-1.5">{formatDate(i.fecha)}</td>
                        <td className="px-2 py-1.5">{i.factura}</td>
                        <td className="px-2 py-1.5">{i.cliente}</td>
                        <td className="px-2 py-1.5">{i.vendedor}</td>
                        <td className="px-2 py-1.5 text-right">{i.kilos.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right">{i.venta.toFixed(2)}</td>
                        <td className="px-2 py-1.5 font-medium">{i.creadoPor || "—"}</td>
                        <td className="px-2 py-1.5">{i.anulada ? <Badge>Anulada</Badge> : "Activa"}</td>
                      </tr>
                    ))
                  : novedades.map((i) => (
                      <tr key={i.id} className="border-b border-border/60">
                        <td className="px-2 py-1.5">{formatDate(i.novedadFecha ?? "")}</td>
                        <td className="px-2 py-1.5">{i.factura}</td>
                        <td className="px-2 py-1.5">{i.cliente}</td>
                        <td className="px-2 py-1.5">{i.vendedor}</td>
                        <td className="px-2 py-1.5">{i.novedad}</td>
                        <td className="px-2 py-1.5 font-medium">{i.novedadPor || "—"}</td>
                      </tr>
                    ))}
                {(tab === "facturas" ? facturas : novedades).length === 0 && (
                  <tr><td colSpan={8} className="px-2 py-8 text-center text-muted-foreground">No hay datos para esos filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
