import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, escucharCambios } from "./api";
import { toFactura, type FacturaDb, type Row } from "./store";
import type { TipoFactura } from "./types";

const numFact = (f: string) => {
  const n = parseInt(String(f || "").replace(/\D/g, ""), 10);
  return isNaN(n) ? Number.POSITIVE_INFINITY : n;
};

/** Orden por número correlativo de factura (numérico). */
export function ordenarPorCorrelativo<T extends { factura: string }>(list: T[]): T[] {
  return list
    .slice()
    .sort((a, b) => numFact(a.factura) - numFact(b.factura) || a.factura.localeCompare(b.factura));
}

/** Nombre del vendedor sin la marca "VIVERES" al final. */
export const baseVendedor = (v: string) =>
  (v || "").toUpperCase().replace(/\s*\(?\s*VIVERES\s*\)?\s*$/i, "").replace(/\s+/g, " ").trim();

export const conViveres = (v: string) => {
  const b = baseVendedor(v);
  return b ? `${b} VIVERES` : "";
};

export const etiquetaTipoFactura = (tipo: TipoFactura) =>
  tipo === "viveres" ? "Víveres" : tipo === "limpieza" ? "Productos de limpieza" : "Embutidos";

/** Todas las facturas visibles para el usuario (todas las semanas). */
export function useFacturasTodas() {
  const [lista, setLista] = useState<FacturaDb[]>([]);
  const [cargando, setCargando] = useState(true);
  const recargar = useCallback(async () => {
    try {
      const data = await api<Row[]>("/api/facturas");
      setLista(ordenarPorCorrelativo(data.map(toFactura)));
    } catch (e) {
      toast.error((e as Error).message);
    }
    setCargando(false);
  }, []);
  useEffect(() => {
    void recargar();
    return escucharCambios(() => void recargar());
  }, [recargar]);
  return { lista, cargando, recargar };
}
