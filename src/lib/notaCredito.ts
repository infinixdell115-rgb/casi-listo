import { normalizar } from "./checklistStats";

export interface NotaCreditoItem {
  producto: string;
  facturado: number;
  recibido: number;
}
export interface NotaCredito {
  items: NotaCreditoItem[];
  kilos_recibidos: number;
  fecha?: string;
  por?: string;
}

/** Kilos que cuentan en los reportes: los recibidos si hay nota de crédito. */
export function kilosEfectivos(r: { kilos: number | string; nota_credito?: NotaCredito | null }) {
  const nc = r.nota_credito;
  if (nc && Number.isFinite(Number(nc.kilos_recibidos))) return Number(nc.kilos_recibidos);
  return Number(r.kilos) || 0;
}

/** factura -> (producto normalizado -> kilos recibidos) */
export type MapaNotas = Record<string, Record<string, number>>;

export function mapaNotas(facturas: { factura: string; notaCredito?: NotaCredito | null }[]): MapaNotas {
  const out: MapaNotas = {};
  for (const f of facturas) {
    if (!f.notaCredito?.items?.length) continue;
    const m: Record<string, number> = {};
    for (const it of f.notaCredito.items) m[normalizar(it.producto)] = Number(it.recibido) || 0;
    out[f.factura.trim()] = m;
  }
  return out;
}

import { useEffect, useState } from "react";
import { api, escucharCambios } from "./api";

/** Mapa de notas de crédito visibles para el usuario, actualizado en vivo. */
export function useNotasCredito(): MapaNotas {
  const [m, setM] = useState<MapaNotas>({});
  useEffect(() => {
    const cargar = () =>
      void api<{ factura: string; notaCredito: NotaCredito }[]>("/api/notas-credito")
        .then((r) => setM(mapaNotas(r)))
        .catch(() => {});
    cargar();
    return escucharCambios(cargar);
  }, []);
  return m;
}
