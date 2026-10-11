import { useMemo, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, ComboInput, EmptyState, Field, TextInput } from "./ui";
import { useStore } from "@/lib/store";
import { DAY_SHEETS, type DaySheet } from "@/lib/types";
import { formatDate, toISO } from "@/lib/excel";
import { inputClass } from "./ui";
import { baseVendedor, conViveres, useFacturasTodas } from "@/lib/facturas";

function uniq(list: string[]) {
  return Array.from(new Set(list.filter(Boolean))).sort();
}

export function Registrar() {
  const { invoices, addPending } = useStore();
  const today = toISO(new Date());
  const [sheet, setSheet] = useState<DaySheet>("LUNES");
  const [cliente, setCliente] = useState("");
  const [fecha, setFecha] = useState(today);
  const [factura, setFactura] = useState("");
  const [kilos, setKilos] = useState("");
  const [venta, setVenta] = useState("");
  const [lugar, setLugar] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [viveres, setViveres] = useState(false);
  const [cajas, setCajas] = useState("");
  const [und, setUnd] = useState("");
  const [m500, setM500] = useState("");
  const [m900, setM900] = useState("");
  const [mAhumada, setMAhumada] = useState("");
  const [mCarne, setMCarne] = useState("");

  const { lista: historico } = useFacturasTodas();
  const base = useMemo(() => [...historico, ...invoices], [historico, invoices]);
  const clientes = useMemo(() => uniq(base.map((i) => i.cliente)), [base]);
  const lugares = useMemo(() => uniq(base.map((i) => i.lugar)), [base]);
  const vendedores = useMemo(() => uniq(base.map((i) => baseVendedor(i.vendedor))), [base]);
  const vendedorFinal = viveres ? conViveres(vendedor) : vendedor.trim().toUpperCase();

  const limpiar = () => {
    setCliente("");
    setFactura("");
    setKilos("");
    setVenta("");
    setLugar("");
    setVendedor("");
    setCajas("");
    setUnd("");
    setM500("");
    setM900("");
    setMAhumada("");
    setMCarne("");
  };
  const n = (v: string) => parseFloat(v.replace(",", ".")) || 0;

  const agregar = () => {
    if (!cliente.trim() || !factura.trim()) {
      toast.error(viveres ? "Cliente y número de factura son obligatorios." : "Cliente y orden de entrega son obligatorios.");
      return;
    }
    if (viveres) {
      addPending({
        sheet: "DIARIO",
        cliente: cliente.trim().toUpperCase(),
        fecha,
        factura: factura.trim(),
        kilos: 0,
        cajas: n(cajas),
        und: n(und),
        venta: n(venta),
        lugar: lugar.trim().toUpperCase(),
        vendedor: vendedorFinal,
      });
      limpiar();
      toast.success("Factura de víveres agregada a pendientes.");
      return;
    }
    addPending({
      sheet,
      cliente: cliente.trim().toUpperCase(),
      fecha,
      factura: factura.trim(),
      kilos: parseFloat(kilos.replace(",", ".")) || 0,
      venta: parseFloat(venta.replace(",", ".")) || 0,
      lugar: lugar.trim().toUpperCase(),
      vendedor: vendedorFinal,
      m500: n(m500),
      m900: n(m900),
      mAhumada: n(mAhumada),
      mCarne: n(mCarne),
    });
    limpiar();
    toast.success("Agregado a pendientes.");
  };

  return (
    <Card title="Registrar factura" badge={<Badge>{viveres ? "DIARIO (VÍVERES)" : sheet}</Badge>}>
      <label className="mb-4 flex w-fit cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium">
        <input type="checkbox" checked={viveres} onChange={(e) => setViveres(e.target.checked)} />
        Factura de víveres
      </label>
      {viveres ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Cliente" className="md:col-span-2">
            <ComboInput options={clientes} value={cliente} placeholder="Cliente" onChange={(e) => setCliente(e.target.value)} />
          </Field>
          <Field label="Fecha de facturación">
            <TextInput type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field label="Número de factura">
            <TextInput value={factura} placeholder="N° de factura" onChange={(e) => setFactura(e.target.value)} />
          </Field>
          <Field label="N° de cajas">
            <TextInput value={cajas} placeholder="Cajas" onChange={(e) => setCajas(e.target.value)} />
          </Field>
          <Field label="N° de unidades">
            <TextInput value={und} placeholder="Unidades" onChange={(e) => setUnd(e.target.value)} />
          </Field>
          <Field label="Venta ($)">
            <TextInput value={venta} placeholder="Venta ($)" onChange={(e) => setVenta(e.target.value)} />
          </Field>
          <Field label="Zona">
            <ComboInput options={lugares} value={lugar} placeholder="Zona" onChange={(e) => setLugar(e.target.value)} />
          </Field>
          <Field label="Vendedor">
            <VendedorSelect options={vendedores} value={vendedor} onChange={setVendedor} />
            {vendedor && <span className="text-[11px] text-muted-foreground">Se guardará como: <b>{vendedorFinal}</b></span>}
          </Field>
        </div>
      ) : (
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Cliente" className="md:col-span-2">
          <ComboInput
            options={clientes}
            value={cliente}
            placeholder="Cliente"
            onChange={(e) => setCliente(e.target.value)}
          />
        </Field>
        <Field label="Fecha de facturación">
          <TextInput type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
        <Field label="Orden de entrega">
          <TextInput
            value={factura}
            placeholder="Orden de entrega"
            onChange={(e) => setFactura(e.target.value)}
          />
        </Field>
        <Field label="Kilos">
          <TextInput value={kilos} placeholder="Kilos" onChange={(e) => setKilos(e.target.value)} />
        </Field>
        <Field label="Venta ($)">
          <TextInput value={venta} placeholder="Venta ($)" onChange={(e) => setVenta(e.target.value)} />
        </Field>
        <Field label="Lugar">
          <ComboInput
            options={lugares}
            value={lugar}
            placeholder="Lugar"
            onChange={(e) => setLugar(e.target.value)}
          />
        </Field>
        <Field label="Vendedor">
          <VendedorSelect options={vendedores} value={vendedor} onChange={setVendedor} />
        </Field>
        <Field label="Hoja destino">
          <select
            className={inputClass}
            value={sheet}
            onChange={(e) => setSheet(e.target.value as DaySheet)}
          >
            {DAY_SHEETS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-3">
          <p className="mb-2 text-sm font-semibold">Mortadelas vendidas (bultos)</p>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Field label="500 GR">
              <TextInput value={m500} placeholder="0" onChange={(e) => setM500(e.target.value)} />
            </Field>
            <Field label="900 GR">
              <TextInput value={m900} placeholder="0" onChange={(e) => setM900(e.target.value)} />
            </Field>
            <Field label="Ahumada">
              <TextInput value={mAhumada} placeholder="0" onChange={(e) => setMAhumada(e.target.value)} />
            </Field>
            <Field label="De carne">
              <TextInput value={mCarne} placeholder="0" onChange={(e) => setMCarne(e.target.value)} />
            </Field>
          </div>
        </div>
      </div>
      )}
      <div className="mt-5 flex gap-3">
        <Button onClick={agregar}>
          Agregar a pendientes <Plus className="size-4" />
        </Button>
        <Button variant="outline" onClick={limpiar}>
          Limpiar
        </Button>
      </div>
    </Card>
  );
}

/** Lista desplegable de vendedores; permite escribir uno nuevo. */
function VendedorSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const [nuevo, setNuevo] = useState(false);
  const enLista = options.includes(value);
  if (nuevo || (value && !enLista)) {
    return (
      <div className="flex gap-2">
        <TextInput autoFocus value={value} placeholder="Nombre del vendedor" onChange={(e) => onChange(e.target.value.toUpperCase())} />
        <Button variant="outline" onClick={() => { setNuevo(false); onChange(""); }}>Lista</Button>
      </div>
    );
  }
  return (
    <select className={inputClass} value={value} onChange={(e) => (e.target.value === "__nuevo" ? setNuevo(true) : onChange(e.target.value))}>
      <option value="">— Elegir vendedor —</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
      <option value="__nuevo">+ Otro vendedor…</option>
    </select>
  );
}

export function Pendientes() {
  const { pendings, removePending, guardarPendientes, busy } = useStore();
  return (
    <Card
      title="Pendientes por guardar"
      badge={<Badge>{pendings.length}</Badge>}
      actions={
        <Button
          disabled={pendings.length === 0 || busy}
          onClick={() => void guardarPendientes()}
        >
          <Save className="size-4" /> Guardar
        </Button>
      }
    >
      {pendings.length === 0 ? (
        <EmptyState>Todavía no hay registros pendientes.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                <th className="px-2 py-2 text-left">Hoja</th>
                <th className="px-2 py-2 text-left">Cliente</th>
                <th className="px-2 py-2 text-left">Fecha</th>
                <th className="px-2 py-2 text-left">Factura</th>
                <th className="px-2 py-2 text-right">Kilos / Cajas</th>
                <th className="px-2 py-2 text-right">Venta</th>
                <th className="px-2 py-2 text-left">Lugar</th>
                <th className="px-2 py-2 text-left">Vendedor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pendings.map((p) => (
                <tr key={p.id} className="border-b border-border/60">
                  <td className="px-2 py-2">{p.sheet}</td>
                  <td className="px-2 py-2">{p.cliente}</td>
                  <td className="px-2 py-2">{formatDate(p.fecha)}</td>
                  <td className="px-2 py-2">{p.factura}</td>
                  <td className="px-2 py-2 text-right">
                    {p.sheet === "DIARIO" ? `${p.cajas || 0} cj / ${p.und || 0} und` : p.kilos.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right">{p.venta.toFixed(2)}</td>
                  <td className="px-2 py-2">{p.lugar}</td>
                  <td className="px-2 py-2">{p.vendedor}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => removePending(p.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Quitar"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
