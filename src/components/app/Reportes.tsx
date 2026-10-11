import { useNotasCredito } from "@/lib/notaCredito";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Eye, FileDown, FolderOpen, Printer, X } from "lucide-react";
import { Button } from "./ui";
import { buildKilosVendedorPdf, buildProductosVendedorPdf, buildVendedorPorFechaPdf, buildVentasDiariasPdf } from "@/lib/reportesPdf";
import { isDesktop, listChecklists, listReportes, openReportesFolder, printPdf, readReporte, saveReporte } from "@/lib/desktop";
import { agrupar, aplanar, aplicarNotas, filtrar } from "@/lib/checklistStats";
import type { Checklist } from "@/lib/types";
import { Badge, Card, TextInput } from "./ui";
import { toFactura, useStore, type Row } from "@/lib/store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/excel";
import { filtrarPorZonas } from "@/lib/filtros";
import { splitVendedor, type Invoice } from "@/lib/types";

interface Grupo {
  vendedor: string;
  facturas: Invoice[];
  kilos: number;
  venta: number;
  marcas: Record<string, { kilos: number; venta: number; count: number }>;
}

export function Reportes() {
  const { invoices: invoicesSemana, semana } = useStore();
  const [desde, setDesde] = useState(semana);
  const [hasta, setHasta] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [rango, setRango] = useState<Invoice[] | null>(null);
  void invoicesSemana;

  useEffect(() => {
    if (!desde || !hasta || desde > hasta) { setRango([]); return; }
    let vivo = true;
    const cargar = () =>
      api<Row[]>(`/api/facturas?desde=${desde}&hasta=${hasta}`)
        .then((data) => { if (vivo) setRango(data.map(toFactura).filter((f) => !f.anulada)); })
        .catch(() => {});
    void cargar();
    return () => { vivo = false; };
  }, [desde, hasta, invoicesSemana]);

  const [vista, setVista] = useState<"kilos" | "viveres" | "productos">("kilos");
  const [preview, setPreview] = useState<{ titulo: string; name: string; data: Uint8Array; guardado?: boolean } | null>(null);
  const [verGuardados, setVerGuardados] = useState(false);
  const [aviso, setAviso] = useState("");
  const todas = rango ?? [];
  const [zonasSel, setZonasSel] = useState<string[]>([]);
  const zonasOpc = useMemo(() => Array.from(new Set(todas.map((i) => (i.lugar || "").trim().toUpperCase()).filter(Boolean))).sort(), [todas]);
  const invoices = useMemo(
    () => filtrarPorZonas(todas.filter((i) => (vista === "viveres" ? i.diario : !i.diario)), zonasSel),
    [todas, vista, zonasSel],
  );
  const zonasTxt = zonasSel.length ? ` · Zonas: ${zonasSel.join(", ")}` : "";
  const zonasArch = zonasSel.length ? `_${zonasSel.join("-").replace(/[^A-Za-z0-9-]+/g, "_")}` : "";
  const periodo = `Del ${formatDate(desde)} al ${formatDate(hasta)}${zonasTxt}`;
  const periodoTxt = periodo;
  const guardar = async (name: string, data: Uint8Array) => {
    const ruta = await saveReporte(name, data);
    setAviso(`Guardado en: ${ruta}`);
  };
  const previsualizar = async (vendedor: string, facturas: Invoice[]) => {
    const tipo = vista === "viveres" ? "viveres" : "kilos";
    const data = await buildVendedorPorFechaPdf(vendedor, facturas, periodoTxt, tipo);
    const nom = vendedor.replace(/[^A-Za-z0-9]+/g, "_");
    setPreview({ titulo: `${tipo === "kilos" ? "Kilos" : "Víveres"} · ${vendedor}`, name: `Reporte_${tipo}_${nom}${zonasArch}_${desde}_a_${hasta}.pdf`, data });
  };

  const exportar = async (tipo: "ventas" | "kilos", imprimir = false) => {
    const bytes = tipo === "ventas" ? await buildVentasDiariasPdf(invoices, semana, periodo) : await buildKilosVendedorPdf(invoices, semana, periodo);
    if (imprimir) return printPdf(bytes, false);
    const pre = vista === "viveres" ? "Viveres_" : "";
    const name = `${pre}${tipo === "ventas" ? "Relacion_ventas_diarias" : "Reporte_kilos_vendedor"}${zonasArch}_${desde}_a_${hasta}.pdf`;
    await guardar(name, bytes);
  };
  const [abiertos, setAbiertos] = useState<string[]>([]);
  const [filtros, setFiltros] = useState<Record<string, string>>({});

  const grupos = useMemo<Grupo[]>(() => {
    const map = new Map<string, Grupo>();
    invoices.forEach((inv) => {
      const { base, marca } = splitVendedor(inv.vendedor);
      const key = base || "SIN VENDEDOR";
      const g =
        map.get(key) ?? ({ vendedor: key, facturas: [], kilos: 0, venta: 0, marcas: {} } as Grupo);
      g.facturas.push(inv);
      g.kilos += inv.kilos || 0;
      g.venta += inv.venta || 0;
      if (marca) {
        const m = g.marcas[marca] ?? { kilos: 0, venta: 0, count: 0 };
        m.kilos += inv.kilos || 0;
        m.venta += inv.venta || 0;
        m.count += 1;
        g.marcas[marca] = m;
      }
      map.set(key, g);
    });
    return Array.from(map.values()).sort((a, b) => b.kilos - a.kilos);
  }, [invoices]);

  const toggle = (v: string) =>
    setAbiertos((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const totalKilos = grupos.reduce((a, g) => a + g.kilos, 0);
  const totalVenta = grupos.reduce((a, g) => a + g.venta, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Button variant={vista === "kilos" ? "primary" : "outline"} onClick={() => setVista("kilos")}>Kilos</Button>
        <Button variant={vista === "viveres" ? "primary" : "outline"} onClick={() => setVista("viveres")}>Víveres</Button>
        <Button variant={vista === "productos" ? "primary" : "outline"} onClick={() => setVista("productos")}>Productos (CheckList)</Button>
        <Button variant="outline" className="ml-auto" onClick={() => setVerGuardados(true)}><FolderOpen className="size-4" />Ver reportes guardados</Button>
      </div>
      {aviso && <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground">{aviso}</p>}
      {preview && (
        <VisorPdf
          titulo={preview.titulo}
          data={preview.data}
          onClose={() => setPreview(null)}
          onPrint={() => void printPdf(preview.data, false)}
          onSave={preview.guardado ? undefined : () => void guardar(preview.name, preview.data)}
        />
      )}
      {verGuardados && (
        <Guardados
          onClose={() => setVerGuardados(false)}
          onVer={(titulo, data) => setPreview({ titulo, name: titulo, data, guardado: true })}
        />
      )}
      {vista === "productos" ? (
        <ProductosVendedor desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} onPreview={(data) =>
          setPreview({ titulo: "Kilos por producto y vendedor", name: `Productos_por_vendedor_${desde}_a_${hasta}.pdf`, data })} periodo={periodoTxt} />
      ) : (<>
      <Card title={vista === "viveres" ? "Víveres · Exportar en PDF" : "Exportar en PDF"}>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Desde
            <input
              type="date"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Hasta
            <input
              type="date"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </label>
          <details className="relative">
            <summary className="flex h-9 cursor-pointer list-none items-center rounded-md border border-input bg-background px-3 text-sm text-foreground">
              Zona: {zonasSel.length ? `${zonasSel.length} seleccionada(s)` : "Todas"}
            </summary>
            <div className="absolute z-20 mt-1 max-h-64 w-56 overflow-auto rounded-md border border-border bg-popover p-2 text-sm text-popover-foreground shadow-md">
              <label className="flex items-center gap-2 py-1">
                <input type="checkbox" checked={zonasSel.length === 0} onChange={() => setZonasSel([])} /> Todas
              </label>
              {zonasOpc.map((z) => (
                <label key={z} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={zonasSel.includes(z)}
                    onChange={() => setZonasSel((p) => (p.includes(z) ? p.filter((x) => x !== z) : [...p, z]))}
                  />
                  {z}
                </label>
              ))}
              {zonasOpc.length === 0 && <p className="py-1 text-xs text-muted-foreground">Sin zonas en el período.</p>}
            </div>
          </details>
          {periodo && (
            <span className="pb-2 text-xs text-muted-foreground">
              Mostrando facturas del {formatDate(desde)} al {formatDate(hasta)}{zonasTxt}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void exportar("ventas")}><FileDown className="size-4" />Relación de ventas diarias</Button>
          <Button variant="outline" onClick={() => void exportar("ventas", true)}><Printer className="size-4" />Imprimir</Button>
          <Button onClick={() => void exportar("kilos")}><FileDown className="size-4" />Reporte de kilos por vendedor</Button>
          <Button variant="outline" onClick={() => void exportar("kilos", true)}><Printer className="size-4" />Imprimir</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Las facturas anuladas no se incluyen.</p>
      </Card>

      <Card title="Resumen general">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Facturas" value={String(invoices.length)} />
          {vista === "viveres"
            ? <Stat label="Total cajas" value={String(invoices.reduce((a, i) => a + (i.cajas || 0), 0))} />
            : <Stat label="Total kilos" value={totalKilos.toFixed(2)} />}
          <Stat label="Total ventas ($)" value={totalVenta.toFixed(2)} />
        </div>
      </Card>

      {grupos.map((g) => {
        const q = (filtros[g.vendedor] ?? "").trim().toUpperCase();
        const facturas = g.facturas.filter(
          (f) =>
            !q || f.factura.toUpperCase().includes(q) || f.cliente.toUpperCase().includes(q),
        );
        const abierto = abiertos.includes(g.vendedor);
        return (
          <Card key={g.vendedor}>
            <div className="flex items-center gap-2">
            <button
              className="flex flex-1 items-center gap-3 text-left"
              onClick={() => toggle(g.vendedor)}
            >
              {abierto ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              <span className="text-sm font-semibold uppercase">{g.vendedor}</span>
              <Badge>{g.facturas.length} facturas</Badge>
              <span className="ml-auto text-sm text-muted-foreground">
                {vista === "viveres"
                  ? `${g.facturas.reduce((a, f) => a + (f.cajas || 0), 0)} cj · ${g.facturas.reduce((a, f) => a + (f.und || 0), 0)} und`
                  : `${g.kilos.toFixed(2)} kg`} · ${g.venta.toFixed(2)}
              </span>
            </button>
            <Button variant="outline" onClick={() => void previsualizar(g.vendedor, g.facturas)}><Eye className="size-4" />Previsualizar</Button>
            </div>

            {Object.keys(g.marcas).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(g.marcas).map(([marca, m]) => (
                  <span
                    key={marca}
                    className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
                  >
                    {marca}: {m.count} fact. · {m.kilos.toFixed(2)} kg · ${m.venta.toFixed(2)}
                  </span>
                ))}
              </div>
            )}

            {abierto && (
              <div className="mt-4">
                <TextInput
                  placeholder="Buscar por número de factura o cliente…"
                  value={filtros[g.vendedor] ?? ""}
                  onChange={(e) =>
                    setFiltros((prev) => ({ ...prev, [g.vendedor]: e.target.value }))
                  }
                />
                <div className="mt-3 max-h-80 overflow-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted text-[11px] uppercase text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2 text-left">Factura</th>
                        <th className="px-2 py-2 text-left">Cliente</th>
                        <th className="px-2 py-2 text-left">Fecha</th>
                        <th className="px-2 py-2 text-right">Kilos</th>
                        <th className="px-2 py-2 text-right">Venta</th>
                        <th className="px-2 py-2 text-left">Lugar</th>
                        <th className="px-2 py-2 text-left">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturas.map((f) => {
                        const marca = splitVendedor(f.vendedor).marca;
                        return (
                          <tr key={f.id} className="border-b border-border/60">
                            <td className="px-2 py-1.5">{f.factura}</td>
                            <td className="px-2 py-1.5">{f.cliente}</td>
                            <td className="px-2 py-1.5">{formatDate(f.fecha)}</td>
                            <td className="px-2 py-1.5 text-right">{f.kilos.toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-right">{f.venta.toFixed(2)}</td>
                            <td className="px-2 py-1.5">{f.lugar}</td>
                            <td className="px-2 py-1.5">{marca ?? "NORMAL"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        );
      })}
      {grupos.length === 0 && (
        <Card>
          <p className="py-8 text-center text-sm text-muted-foreground">
            {vista === "viveres" ? "No hay facturas de víveres en este período." : "No hay facturas en este período."}
          </p>
        </Card>
      )}
      </>)}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-4">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function VisorPdf({ titulo, data, onClose, onPrint, onSave }: { titulo: string; data: Uint8Array; onClose: () => void; onPrint: () => void; onSave?: (() => void) | undefined }) {
  const url = useMemo(() => URL.createObjectURL(new Blob([data as unknown as BlobPart], { type: "application/pdf" })), [data]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <span className="text-sm font-semibold uppercase">{titulo}</span>
          <div className="ml-auto flex gap-2">
            {onSave && <Button onClick={onSave}><FileDown className="size-4" />Guardar</Button>}
            <Button variant="outline" onClick={onPrint}><Printer className="size-4" />Imprimir</Button>
            <Button variant="outline" onClick={onClose}><X className="size-4" />Cerrar</Button>
          </div>
        </div>
        <iframe title={titulo} src={url} className="flex-1 bg-background" />
      </div>
    </div>
  );
}

function Guardados({ onClose, onVer }: { onClose: () => void; onVer: (titulo: string, data: Uint8Array) => void }) {
  const [lista, setLista] = useState<{ carpeta: string; archivos: string[] }[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);
  useEffect(() => { void listReportes().then((l) => { setLista(l); setAbierta(l[0]?.carpeta ?? null); }); }, []);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/50 p-4">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <span className="text-sm font-semibold uppercase">Reportes guardados</span>
          <div className="ml-auto flex gap-2">
            {isDesktop() && <Button variant="outline" onClick={() => void openReportesFolder()}><FolderOpen className="size-4" />Abrir carpeta</Button>}
            <Button variant="outline" onClick={onClose}><X className="size-4" />Cerrar</Button>
          </div>
        </div>
        <div className="overflow-auto p-4">
          {!isDesktop() && <p className="text-sm text-muted-foreground">Disponible en el programa de escritorio.</p>}
          {isDesktop() && lista.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay reportes guardados.</p>}
          {lista.map((c) => (
            <div key={c.carpeta} className="mb-2 rounded-md border border-border">
              <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold" onClick={() => setAbierta(abierta === c.carpeta ? null : c.carpeta)}>
                {abierta === c.carpeta ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                {c.carpeta} <Badge>{c.archivos.length}</Badge>
              </button>
              {abierta === c.carpeta && (
                <ul className="border-t border-border">
                  {c.archivos.map((a) => (
                    <li key={a}>
                      <button className="flex w-full items-center gap-2 px-4 py-1.5 text-left text-sm hover:bg-muted" onClick={async () => {
                        const data = await readReporte(c.carpeta, a);
                        if (data) onVer(`${c.carpeta} · ${a}`, data);
                      }}><Eye className="size-4" />{a}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductosVendedor({ desde, hasta, setDesde, setHasta, periodo, onPreview }: {
  desde: string; hasta: string; setDesde: (v: string) => void; setHasta: (v: string) => void; periodo: string; onPreview: (d: Uint8Array) => void;
}) {
  const [lista, setLista] = useState<Checklist[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [zona, setZona] = useState("");
  useEffect(() => { void listChecklists().then(setLista); }, []);
  const notas = useNotasCredito();
  const todas = useMemo(() => aplicarNotas(aplanar(lista), notas), [lista, notas]);
  const zonas = useMemo(() => agrupar(todas, "zona").map((g) => g.nombre).sort(), [todas]);
  const filas = useMemo(() => filtrar(todas, desde, hasta, "", zona), [todas, desde, hasta, zona]);
  const vendedores = useMemo(
    () => agrupar(filas, "vendedor").map((v) => ({
      vendedor: v.nombre,
      kilos: v.kilos,
      productos: agrupar(filas.filter((r) => r.vendedor === v.nombre), "producto"),
    })),
    [filas],
  );
  const pendientes = lista.filter((c) => (c.estado ?? "pendiente") === "pendiente").length;
  return (
    <>
      <Card title="Kilos por producto de cada vendedor (CheckList)">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">Desde
            <input type="date" className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">Hasta
            <input type="date" className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
          <Button onClick={async () => onPreview(await buildProductosVendedorPdf(periodo, vendedores))}><Eye className="size-4" />Previsualizar reporte</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Solo cuentan los checklist con kilos cargados. Pendientes sin kilos: {pendientes}.</p>
      </Card>
      {vendedores.map((v) => (
        <Card key={v.vendedor}>
          <button className="flex w-full items-center gap-3 text-left" onClick={() => setAbierto(abierto === v.vendedor ? null : v.vendedor)}>
            {abierto === v.vendedor ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            <span className="text-sm font-semibold uppercase">{v.vendedor}</span>
            <Badge>{v.productos.length} productos</Badge>
            <span className="ml-auto text-sm text-muted-foreground">{v.kilos.toFixed(2)} kg</span>
          </button>
          {abierto === v.vendedor && (
            <table className="mt-3 w-full text-sm">
              <thead className="bg-muted text-[11px] uppercase text-muted-foreground">
                <tr><th className="px-2 py-2 text-left">Producto</th><th className="px-2 py-2 text-right">Kilos</th><th className="px-2 py-2 text-right">%</th></tr>
              </thead>
              <tbody>
                {v.productos.map((p) => (
                  <tr key={p.nombre} className="border-b border-border/60">
                    <td className="px-2 py-1.5">{p.nombre}</td>
                    <td className="px-2 py-1.5 text-right">{p.kilos.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-right">{p.pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ))}
      {vendedores.length === 0 && <Card><p className="py-8 text-center text-sm text-muted-foreground">No hay checklist con kilos en este período.</p></Card>}
    </>
  );
}
