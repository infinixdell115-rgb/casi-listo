import { describe, expect, it } from "vitest";
import { agruparMaster, semanaDelMes } from "./master";

describe("master de clientes", () => {
  it("semana del mes según calendario (oct 2026 empieza jueves)", () => {
    expect(semanaDelMes("2026-10-01")).toBe(1);
    expect(semanaDelMes("2026-10-04")).toBe(1);
    expect(semanaDelMes("2026-10-05")).toBe(2);
    expect(semanaDelMes("2026-10-26")).toBe(5);
  });
  it("una sexta semana se suma a la 5 (ago 2026: 31 es lunes)", () => {
    expect(semanaDelMes("2026-08-31")).toBe(5);
  });
  it("solo suma facturas en carpeta y separa foráneas", () => {
    const r = agruparMaster(
      [
        { cliente: "Ana", lugar: "Maracay", fecha: "2026-10-05", kilos: 10, en_carpeta: true },
        { cliente: "ana ", lugar: "Maracay", fecha: "2026-10-06", kilos: 5, en_carpeta: false },
        { cliente: "Luis", lugar: "Coro", fecha: "2026-10-01", kilos: 7, en_carpeta: true, diario: true, cajas: 3, und: 2 },
      ],
      ["coro"],
      "2026-10",
    );
    expect(r.clientes).toHaveLength(2);
    expect(r.local.kilos[1]).toBe(10);
    expect(r.foranea.kilos[0]).toBe(7);
    expect(r.foranea.cajas).toBe(3);
    expect(r.local.cajas).toBe(0);
  });
});
