import { describe, expect, it } from "vitest";
import { filtrarPorZonas } from "./filtros";

const rows = [{ lugar: "BARINAS" }, { lugar: "GUANARE" }, { lugar: "ACARIGUA" }];

describe("filtrarPorZonas", () => {
  it("solo deja las zonas seleccionadas", () => {
    expect(filtrarPorZonas(rows, ["BARINAS", "GUANARE"]).map((r) => r.lugar)).toEqual(["BARINAS", "GUANARE"]);
  });
  it("sin selección muestra todas", () => {
    expect(filtrarPorZonas(rows, [])).toHaveLength(3);
  });
});
