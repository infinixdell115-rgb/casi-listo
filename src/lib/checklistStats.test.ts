import { describe, expect, it } from "vitest";
import { agrupar, aplanar, filtrar } from "./checklistStats";
import type { Checklist } from "./types";

const base = (o: Partial<Checklist>): Checklist =>
  ({
    id: "x", creado: "2026-10-05T12:00:00", jefe: "", vendedor: "ANA", direccion: "", cliente: "C1",
    factura: "F1", dia: "", mes: "", anio: "", items: [], ...o,
  }) as Checklist;

describe("checklistStats", () => {
  const lista = [
    base({ estado: "completado", items: [{ cant: "1", descripcion: "Costilla", peso: "10" }, { cant: "1", descripcion: "Pata", peso: "5" }] }),
    base({ id: "y", estado: "completado", cliente: "C2", vendedor: "LUIS", items: [{ cant: "1", descripcion: "costilla ", peso: "4" }] }),
    base({ id: "z", estado: "pendiente", items: [{ cant: "1", descripcion: "Pata", peso: "99" }] }),
  ];

  it("excluye pendientes", () => {
    expect(aplanar(lista).reduce((a, r) => a + r.kilos, 0)).toBe(19);
  });
  it("agrupa productos sin importar mayúsculas/espacios y ordena", () => {
    const g = agrupar(aplanar(lista), "producto");
    expect(g[0]).toMatchObject({ nombre: "COSTILLA", kilos: 14 });
    expect(g[1]).toMatchObject({ nombre: "PATA", kilos: 5 });
  });
  it("filtra por vendedor", () => {
    expect(agrupar(filtrar(aplanar(lista), "", "", "LUIS"), "cliente")).toEqual([
      { nombre: "C2", kilos: 4, veces: 1, pct: 100 },
    ]);
  });
});
