import { kilosEfectivos, type NotaCredito } from "./notaCredito";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { api, escucharCambios, setToken, type Usuario } from "./api";
import { toISO } from "./excel";
import { ordenarPorCorrelativo } from "./facturas";
import {
  emptySidecar,
  type DespachoHeader,
  type Invoice,
  type Novedad,
  type PendingInvoice,
  type SidecarData,
} from "./types";

export interface Row {
  id: string; semana: string; dia: string; cliente: string; fecha: string; factura: string;
  kilos: number; venta: number; lugar: string; vendedor: string; cajas: number | null; und: number | null;
  m500?: number | null; m900?: number | null; m_ahumada?: number | null; m_carne?: number | null;
  diario: boolean; novedad: string | null; novedad_fecha: string | null; en_carpeta: boolean;
  anulada: boolean; anulada_motivo: string | null; anulada_en: string | null; anulada_por: string | null;
  creado_por?: string | null; novedad_por?: string | null;
  nota_credito?: NotaCredito | null;
}
type RowUpdate = Partial<Row>;

export interface FacturaDb extends Invoice {
  novedad: string | null;
  novedadFecha: string | null;
  enCarpeta: boolean;
  anulada: boolean;
  anuladaMotivo: string | null;
  anuladaEn: string | null;
  anuladaPor: string | null;
  creadoPor: string;
  novedadPor: string | null;
  /** nota de crédito: kilos que sí recibió el cliente */
  notaCredito: NotaCredito | null;
  /** kilos originales de la factura (kilos = efectivos, tras nota de crédito) */
  kilosFacturados: number;
}

interface StoreValue {
  user: Usuario;
  semana: string;
  setSemana: (fechaCualquiera: string) => void;
  /** facturas activas (sin anuladas) — base de todas las sumas */
  invoices: Invoice[];
  /** todas las facturas de la semana, incluidas anuladas */
  todas: FacturaDb[];
  anuladas: FacturaDb[];
  pendings: PendingInvoice[];
  sidecar: SidecarData;
  busy: boolean;
  cargando: boolean;
  addPending: (p: Omit<PendingInvoice, "id">) => void;
  removePending: (id: string) => void;
  clearPendings: () => void;
  guardarPendientes: () => Promise<void>;
  setNovedad: (inv: Invoice, texto: string, nota?: NotaCredito | null) => void;
  removeNovedad: (factura: string) => void;
  toggleCarpeta: (factura: string) => void;
  setDespachoHeader: (h: DespachoHeader) => void;
  setSeleccionadas: (ids: string[]) => void;
  anular: (id: string, motivo: string) => Promise<void>;
  restaurar: (id: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore fuera del proveedor");
  return ctx;
}

/** Lunes de la semana de la fecha dada (yyyy-mm-dd). */
export function lunesDe(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y ?? 2000, (m || 1) - 1, d || 1);
  const dow = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - dow);
  return toISO(dt);
}

export function toFactura(r: Row): FacturaDb {
  return {
    id: r.id,
    sheet: r.dia,
    row: 0,
    cliente: r.cliente,
    fecha: r.fecha,
    factura: r.factura,
    kilos: kilosEfectivos(r),
    kilosFacturados: Number(r.kilos) || 0,
    notaCredito: r.nota_credito ?? null,
    venta: Number(r.venta) || 0,
    lugar: r.lugar,
    vendedor: r.vendedor,
    ...(r.cajas == null ? {} : { cajas: Number(r.cajas) }),
    ...(r.und == null ? {} : { und: Number(r.und) }),
    ...(r.m500 == null ? {} : { m500: Number(r.m500) }),
    ...(r.m900 == null ? {} : { m900: Number(r.m900) }),
    ...(r.m_ahumada == null ? {} : { mAhumada: Number(r.m_ahumada) }),
    ...(r.m_carne == null ? {} : { mCarne: Number(r.m_carne) }),
    diario: r.diario,
    novedad: r.novedad,
    novedadFecha: r.novedad_fecha,
    enCarpeta: r.en_carpeta,
    anulada: r.anulada,
    anuladaMotivo: r.anulada_motivo,
    anuladaEn: r.anulada_en,
    anuladaPor: r.anulada_por,
    creadoPor: r.creado_por ?? "",
    novedadPor: r.novedad_por ?? null,
  };
}

const DESP_KEY = "cibao-despacho";

function loadDespacho(): SidecarData["despacho"] {
  try {
    const raw = localStorage.getItem(DESP_KEY);
    if (raw) return { ...emptySidecar().despacho, ...(JSON.parse(raw) as SidecarData["despacho"]) };
  } catch {
    /* ignore */
  }
  return emptySidecar().despacho;
}

export function StoreProvider({ user, onSalir, children }: { user: Usuario; onSalir: () => void; children: ReactNode }) {
  const [semana, setSemanaState] = useState(() => lunesDe(toISO(new Date())));
  const [todas, setTodas] = useState<FacturaDb[]>([]);
  const [pendings, setPendings] = useState<PendingInvoice[]>([]);
  const [despacho, setDespacho] = useState(loadDespacho);
  const [busy, setBusy] = useState(false);
  const [cargando, setCargando] = useState(true);

  const quien = user.usuario;

  const recargar = useCallback(async () => {
    try {
      const data = await api<Row[]>(`/api/facturas`);
      setTodas(data.map(toFactura));
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message);
    }
    setCargando(false);
  }, [semana]);

  useEffect(() => {
    setCargando(true);
    void recargar();
    return escucharCambios(() => void recargar());
  }, [semana, recargar]);

  const setSemana = useCallback((iso: string) => {
    if (!iso) return;
    setPendings([]);
    setSemanaState(lunesDe(iso));
  }, []);

  const patchFactura = useCallback(
    async (id: string, patch: RowUpdate) => {
      setTodas((prev) =>
        prev.map((f) => (f.id === id ? toFactura({ ...toRow(f), ...patch } as Row) : f)),
      );
      try {
        await api(`/api/facturas/${id}`, { method: "PATCH", body: patch });
      } catch (e) {
        toast.error((e as Error).message);
        void recargar();
      }
    },
    [recargar],
  );

  const addPending = useCallback((p: Omit<PendingInvoice, "id">) => {
    setPendings((prev) => [...prev, { ...p, id: `${Date.now()}-${Math.random()}` }]);
  }, []);
  const removePending = useCallback((id: string) => {
    setPendings((prev) => prev.filter((p) => p.id !== id));
  }, []);
  const clearPendings = useCallback(() => setPendings([]), []);

  const guardarPendientes = useCallback(async () => {
    if (pendings.length === 0) return;
    setBusy(true);
    const rows = pendings.map((p) => ({
      semana: p.fecha ? lunesDe(p.fecha) : semana,
      dia: p.sheet,
      cliente: p.cliente,
      fecha: p.fecha,
      factura: p.factura,
      kilos: p.kilos,
      venta: p.venta,
      lugar: p.lugar,
      vendedor: p.vendedor,
      cajas: p.cajas ?? null,
      und: p.und ?? null,
      m500: p.m500 ?? null,
      m900: p.m900 ?? null,
      m_ahumada: p.mAhumada ?? null,
      m_carne: p.mCarne ?? null,
      diario: p.sheet === "DIARIO",
      creado_por: quien,
    }));
    try {
      await api("/api/facturas", { method: "POST", body: rows });
    } catch (e) {
      setBusy(false);
      toast.error((e as Error).message);
      return;
    }
    setBusy(false);
    setPendings([]);
    toast.success(`${rows.length} factura(s) guardadas.`);
    void recargar();
  }, [pendings, semana, quien, recargar]);

  const porFactura = useCallback(
    (factura: string) => todas.filter((f) => f.factura === factura),
    [todas],
  );

  const setNovedad = useCallback(
    (inv: Invoice, texto: string, nota: NotaCredito | null = null) => {
      void patchFactura(inv.id, { novedad: texto, novedad_fecha: toISO(new Date()), novedad_por: quien, nota_credito: nota });
    },
    [patchFactura, quien],
  );

  const removeNovedad = useCallback(
    (factura: string) => {
      porFactura(factura).forEach((f) =>
        void patchFactura(f.id, { novedad: null, novedad_fecha: null, nota_credito: null }),
      );
    },
    [porFactura, patchFactura],
  );

  const toggleCarpeta = useCallback(
    (factura: string) => {
      const list = porFactura(factura);
      const next = !list.some((f) => f.enCarpeta);
      list.forEach((f) => void patchFactura(f.id, { en_carpeta: next }));
    },
    [porFactura, patchFactura],
  );

  const saveDespacho = (d: SidecarData["despacho"]) => {
    setDespacho(d);
    localStorage.setItem(DESP_KEY, JSON.stringify(d));
  };
  const setDespachoHeader = useCallback(
    (header: DespachoHeader) => saveDespacho({ ...loadDespacho(), header }),
    [],
  );
  const setSeleccionadas = useCallback(
    (ids: string[]) => saveDespacho({ ...loadDespacho(), seleccionadas: ids }),
    [],
  );

  const anular = useCallback(
    async (id: string, motivo: string) => {
      await patchFactura(id, {
        anulada: true,
        anulada_motivo: motivo,
        anulada_en: new Date().toISOString(),
        anulada_por: quien,
      });
      void recargar();
      toast.success("Factura anulada.");
    },
    [patchFactura, quien, recargar],
  );

  const restaurar = useCallback(
    async (id: string) => {
      await patchFactura(id, {
        anulada: false,
        anulada_motivo: null,
        anulada_en: null,
        anulada_por: null,
      });
      toast.success("La factura volvió a estar activa.");
    },
    [patchFactura],
  );

  const cerrarSesion = useCallback(async () => {
    try { await api("/api/logout", { method: "POST" }); } catch { /* */ }
    setToken(null);
    onSalir();
  }, [onSalir]);

  const ordenadas = useMemo(() => ordenarPorCorrelativo(todas), [todas]);
  const invoices = useMemo(() => ordenadas.filter((f) => !f.anulada), [ordenadas]);
  const anuladas = useMemo(() => ordenadas.filter((f) => f.anulada), [ordenadas]);

  const sidecar = useMemo<SidecarData>(() => {
    const novedades: Record<string, Novedad> = {};
    todas.forEach((f) => {
      if (f.novedad)
        novedades[f.factura] = {
          factura: f.factura,
          cliente: f.cliente,
          vendedor: f.vendedor,
          texto: f.novedad,
          fecha: f.novedadFecha ?? "",
        };
    });
    return {
      novedades,
      enCarpeta: Array.from(new Set(todas.filter((f) => f.enCarpeta).map((f) => f.factura))),
      despacho,
    };
  }, [todas, despacho]);

  const value: StoreValue = {
    user,
    semana,
    setSemana,
    invoices,
    todas: ordenadas,
    anuladas,
    pendings,
    sidecar,
    busy,
    cargando,
    addPending,
    removePending,
    clearPendings,
    guardarPendientes,
    setNovedad,
    removeNovedad,
    toggleCarpeta,
    setDespachoHeader,
    setSeleccionadas,
    anular,
    restaurar,
    cerrarSesion,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function toRow(f: FacturaDb): Partial<Row> {
  return {
    id: f.id,
    dia: f.sheet,
    cliente: f.cliente,
    fecha: f.fecha,
    factura: f.factura,
    kilos: f.kilosFacturados ?? f.kilos,
    venta: f.venta,
    lugar: f.lugar,
    vendedor: f.vendedor,
    cajas: f.cajas ?? null,
    und: f.und ?? null,
    m500: f.m500 ?? null,
    m900: f.m900 ?? null,
    m_ahumada: f.mAhumada ?? null,
    m_carne: f.mCarne ?? null,
    diario: !!f.diario,
    novedad: f.novedad,
    novedad_fecha: f.novedadFecha,
    en_carpeta: f.enCarpeta,
    anulada: f.anulada,
    anulada_motivo: f.anuladaMotivo,
    anulada_en: f.anuladaEn,
    anulada_por: f.anuladaPor,
    creado_por: f.creadoPor,
    novedad_por: f.novedadPor,
    nota_credito: f.notaCredito,
  };
}
