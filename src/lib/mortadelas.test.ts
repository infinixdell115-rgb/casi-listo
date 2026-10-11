import { describe, expect, it } from "vitest";
import { headerParaFacturas, type Invoice } from "./types";

const inv = (vendedor: string, m: Partial<Invoice>): Invoice =>
  ({ id: vendedor, sheet: "LUNES", row: 0, cliente: "", fecha: "", factura: "", kilos: 0, venta: 0, lugar: "", vendedor, ...m }) as Invoice;
const header = { g500: "10", g900: "5", carne: "3", ahumada: "2" };

describe("mortadelas por vendedor", () => {
  it("la relación de un vendedor solo suma sus mortadelas", () => {
    const pedro = [inv("PEDRO", { m500: 2, m900: 0, mCarne: 1, mAhumada: 0 }), inv("PEDRO", { m500: 3, m900: 1, mCarne: 0, mAhumada: 0 })];
    expect(headerParaFacturas(header, pedro)).toEqual({ g500: "5", g900: "1", carne: "1", ahumada: "" });
  });
  it("facturas antiguas sin mortadelas mantienen la planilla", () => {
    expect(headerParaFacturas(header, [inv("ANA", {})])).toEqual(header);
  });
});
