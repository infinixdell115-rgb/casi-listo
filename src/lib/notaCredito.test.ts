import { describe, expect, it } from "vitest";
import { kilosEfectivos, mapaNotas } from "./notaCredito";
import { aplicarNotas, type FilaProducto } from "./checklistStats";

describe("nota de crédito", () => {
  it("usa los kilos recibidos", () => {
    expect(kilosEfectivos({ kilos: 30 })).toBe(30);
    expect(kilosEfectivos({ kilos: 30, nota_credito: { items: [], kilos_recibidos: 25 } })).toBe(25);
  });
  it("ajusta productos del checklist", () => {
    const filas = [{ factura: "100", producto: "COSTILLA", kilos: 10 }, { factura: "100", producto: "PATA", kilos: 5 }] as FilaProducto[];
    const m = mapaNotas([{ factura: "100", notaCredito: { items: [{ producto: "Costilla", facturado: 10, recibido: 7 }], kilos_recibidos: 12 } }]);
    expect(aplicarNotas(filas, m).map((f) => f.kilos)).toEqual([7, 5]);
  });
});
