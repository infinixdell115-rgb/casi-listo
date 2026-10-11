import { Fragment, useEffect, useMemo, useState } from "react";
import { Eye, FileDown, FileSpreadsheet, Printer, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card } from "./ui";
import { api, escucharCambios } from "@/lib/api";
import { useStore } from "@/lib/store";
import { filtrarDespachos, rangoDe, type DespachoHecho } from "@/lib/filtros";
import { buildDespachoExcel, formatDate } from "@/lib/excel";
import { buildAllDespachoPdfs, buildPreviewPdf } from "@/lib/pdf";
import { printPdf, saveDespachoExcel, savePdfFiles } from "@/lib/desktop";
import { FiltroBar, filtroInicial, uniq } from "./FiltroBar";

export function useDespachosHechos() {
  const [lista, setLista] = useState<DespachoHecho[]>([]);
  useEffect(() => {
    const cargar = () =>
      void api<DespachoHecho[]>("/api/despachos").then(setLista).catch((e) => toast.error((e as Error).message));
    cargar();
    return escucharCambios(cargar);
  }, []);
  return lista;
}

export function DespachosHechos({ titulo = "Relaciones hechas" }: { titulo?: string }) {
  const { user } = useStore();
  const lista = useDespachosHechos();
  const [f, setF] = useState(filtroInicial);
  const [abierta, setAbierta] = useState<string | null>(null);

  const filtradas = useMemo(
    () => filtrarDespachos(lista, { ...f, rango: rangoDe(f.periodo, new Date(), f.desde, f.hasta) }),
    [lista, f],
  );
  const vendedores = useMemo(() => uniq(lista.flatMap((d) => d.facturas.map((i) => i.vendedor))), [lista]);
  const zonas = useMemo(() => uniq(lista.map((d) => d.header?.zona ?? "")), [lista]);
  const usuarios = useMemo(() => uniq(lista.map((d) => d.creado_por)), [lista]);

  const pdfs = async (d: DespachoHecho) => {
    const files = await buildAllDespachoPdfs(d.header, d.facturas);
    if (await savePdfFiles(files.map((x) => ({ name: x.name, data: x.data })))) toast.success("PDF guardados.");
  };
  const excel = async (d: DespachoHecho) => {
    const file = await buildDespachoExcel(d.header, d.facturas);
    if (await saveDespachoExcel(file.name, file.data)) toast.success("Excel guardado.");
  };
  const imprimir = async (d: DespachoHecho) => printPdf(await buildPreviewPdf(d.header, d.facturas));
  const puedeBorrar = user.esAdmin || (user.modulos as string[]).includes("despachos_eliminar");
  const [vista, setVista] = useState<{ url: string; d: DespachoHecho } | null>(null);
  const visualizar = async (d: DespachoHecho) => {
    const data = await buildPreviewPdf(d.header, d.facturas);
    const url = URL.createObjectURL(new Blob([data as BlobPart], { type: "application/pdf" }));
    setVista({ url, d });
  };
  const cerrarVista = () => {
    if (vista) URL.revokeObjectURL(vista.url);
    setVista(null);
  };
  const eliminar = async (d: DespachoHecho) => {
    if (!confirm(`¿Eliminar la relación de despacho de ${d.header?.zona ?? ""} (${d.facturas.length} facturas)?`)) return;
    try {
      await api(`/api/despachos/${d.id}`, { method: "DELETE" });
      toast.success("Relación eliminada.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card title={titulo} badge={<Badge>{filtradas.length}</Badge>}>
      <FiltroBar f={f} set={setF} usuarios={user.esAdmin ? usuarios : undefined} vendedores={vendedores} zonas={zonas} />
      <div className="mt-4 max-h-[32rem] overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left">Fecha despacho</th>
              <th className="px-2 py-2 text-left">Zona</th>
              <th className="px-2 py-2 text-left">Chofer</th>
              <th className="px-2 py-2 text-left">Vendedores</th>
              <th className="px-2 py-2 text-right">Facturas</th>
              <th className="px-2 py-2 text-right">Kilos</th>
              {user.esAdmin && <th className="px-2 py-2 text-left">Hecha por</th>}
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtradas.map((d) => {
              const kilos = d.facturas.reduce((a, b) => a + (b.kilos || 0), 0);
              return (
                <Fragment key={d.id}>
                  <tr className="cursor-pointer border-b border-border/60 hover:bg-accent" onClick={() => setAbierta(abierta === d.id ? null : d.id)}>
                    <td className="px-2 py-1.5">{formatDate(d.header?.fecha || d.creado.slice(0, 10))}</td>
                    <td className="px-2 py-1.5">{d.header?.zona}</td>
                    <td className="px-2 py-1.5">{d.header?.chofer}</td>
                    <td className="px-2 py-1.5">{uniq(d.facturas.map((i) => i.vendedor)).join(", ")}</td>
                    <td className="px-2 py-1.5 text-right">{d.facturas.length}</td>
                    <td className="px-2 py-1.5 text-right">{kilos.toFixed(2)}</td>
                    {user.esAdmin && <td className="px-2 py-1.5">{d.creado_por}</td>}
                    <td className="px-2 py-1.5">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" onClick={() => void visualizar(d)} title="Visualizar"><Eye className="size-4" /></Button>
                        <Button variant="outline" onClick={() => void imprimir(d)} title="Imprimir"><Printer className="size-4" /></Button>
                        <Button variant="outline" onClick={() => void pdfs(d)} title="PDF"><FileDown className="size-4" /></Button>
                        <Button variant="outline" onClick={() => void excel(d)} title="Excel"><FileSpreadsheet className="size-4" /></Button>
                        {puedeBorrar && <Button variant="outline" onClick={() => void eliminar(d)} title="Eliminar"><Trash2 className="size-4 text-destructive" /></Button>}
                      </div>
                    </td>
                  </tr>
                  {abierta === d.id && (
                    <tr className="bg-muted/40">
                      <td colSpan={8} className="px-3 py-2 text-xs">
                        {d.facturas.map((i) => (
                          <div key={i.id} className="flex gap-3">
                            <span className="w-24">{i.factura}</span>
                            <span className="flex-1">{i.cliente}</span>
                            <span className="w-40">{i.vendedor}</span>
                            <span className="w-20 text-right">{(i.kilos || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtradas.length === 0 && (
              <tr><td colSpan={8} className="px-2 py-8 text-center text-muted-foreground">No hay relaciones para esos filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {vista && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/80 p-6 backdrop-blur-sm">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-sm font-semibold">Relación de despacho — {vista.d.header?.zona} {formatDate(vista.d.header?.fecha || vista.d.creado.slice(0, 10))}</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void imprimir(vista.d)}><Printer className="size-4" /> Imprimir</Button>
                <Button variant="outline" onClick={cerrarVista}><X className="size-4" /> Cerrar</Button>
              </div>
            </div>
            <iframe title="Vista previa" src={vista.url} className="flex-1" />
          </div>
        </div>
      )}
    </Card>
  );
}
