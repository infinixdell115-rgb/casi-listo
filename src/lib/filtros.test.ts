import { describe, expect, it } from "vitest";
import { filtrarDespachos, filtrarFacturas, rangoDe, type DespachoHecho } from "./filtros";
import type { Invoice } from "./types";

const inv = (p: Partial<Invoice & { creadoPor: string }>) =>
  ({ id: "x", sheet: "LUNES", row: 0, cliente: "", fecha: "2026-10-07", factura: "", kilos: 0, venta: 0, lugar: "", vendedor: "", ...p }) as Invoice & { creadoPor: string };

describe("períodos", () => {
  const hoy = new Date(2026, 9, 8); // jueves 8 oct 2026
  it("semana va de lunes a domingo", () => expect(rangoDe("semana", hoy)).toEqual({ desde: "2026-10-05", hasta: "2026-10-11" }));
  it("mes completo", () => expect(rangoDe("mes", hoy)).toEqual({ desde: "2026-10-01", hasta: "2026-10-31" }));
  it("año completo", () => expect(rangoDe("anio", hoy)).toEqual({ desde: "2026-01-01", hasta: "2026-12-31" }));
});

describe("filtros", () => {
  it("filtra facturas por usuario que las registró", () => {
    const rows = [inv({ creadoPor: "ANA" }), inv({ creadoPor: "LUIS" })];
    expect(filtrarFacturas(rows, { rango: { desde: "", hasta: "" }, usuario: "ana" })).toHaveLength(1);
  });
  it("una relación aparece al filtrar por un vendedor que incluye", () => {
    const d: DespachoHecho = {
      id: "1", creado: "2026-10-08T10:00:00Z", creado_por: "ANA", tipo: "pdf",
      header: { zona: "", fecha: "2026-10-08", chofer: "", vehiculo: "", g500: "", g900: "", carne: "", ahumada: "" },
      facturas: [inv({ vendedor: "PEDRO" })],
    };
    const r = { desde: "2026-10-01", hasta: "2026-10-31" };
    expect(filtrarDespachos([d], { rango: r, vendedor: "PEDRO" })).toHaveLength(1);
    expect(filtrarDespachos([d], { rango: r, vendedor: "JUAN" })).toHaveLength(0);
  });
});
