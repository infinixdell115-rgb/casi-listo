import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Badge, Button, Card, Field, TextInput } from "./ui";
import { api, escucharCambios } from "@/lib/api";
import { useStore } from "@/lib/store";
import { agruparMaster, type FilaMaster, type Tot } from "@/lib/master";

const hoyMes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const n = (v: number) => (v ? (Math.round(v * 100) / 100).toLocaleString("es") : "");

export function MasterClientes() {
  const { user } = useStore();
  const [rows, setRows] = useState<FilaMaster[]>([]);
  const [zonas, setZonas] = useState<string[]>([]);
  const [mes, setMes] = useState(hoyMes());
  const [buscar, setBuscar] = useState("");
  const [tipo, setTipo] = useState<"todos" | "local" | "foraneo">("todos");
  const [nueva, setNueva] = useState("");

  const cargar = useCallback(async () => {
    try {
      const [f, z] = await Promise.all([api<FilaMaster[]>("/api/master"), api<string[]>("/api/zonas-foraneas")]);
      setRows(f);
      setZonas(z);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void cargar();
    return escucharCambios(() => void cargar());
  }, [cargar]);

  const datos = useMemo(() => agruparMaster(rows, zonas, mes), [rows, zonas, mes]);
  const lista = datos.clientes.filter(
    (c) =>
      (!buscar || c.cliente.includes(buscar.toUpperCase().trim())) &&
      (tipo === "todos" || (tipo === "foraneo") === c.foranea),
  );

  const guardarZonas = async (z: string[]) => {
    try {
      setZonas(await api<string[]>("/api/zonas-foraneas", { method: "PUT", body: { zonas: z } }));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const lugares = Array.from(new Set(rows.map((r) => (r.lugar || "").trim().toUpperCase()).filter(Boolean))).sort();

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Resumen titulo="Zona local" t={datos.local} />
        <Resumen titulo="Zonas foráneas" t={datos.foranea} />
      </div>

      <Card title="Master de clientes" badge={<Badge>{datos.clientes.length} clientes</Badge>}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Mes">
            <TextInput type="month" value={mes} onChange={(e) => setMes(e.target.value || hoyMes())} />
          </Field>
          <Field label="Buscar cliente">
            <TextInput value={buscar} placeholder="Buscar…" onChange={(e) => setBuscar(e.target.value)} />
          </Field>
          <Field label="Zona">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as typeof tipo)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="todos">Todas</option>
              <option value="local">Local</option>
              <option value="foraneo">Foráneas</option>
            </select>
          </Field>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Solo se suman los kilos de las facturas marcadas en carpeta.</p>
        <div className="mt-3 max-h-[32rem] overflow-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">Cliente</th>
                <th className="px-2 py-2 text-left">Lugar</th>
                <th className="px-2 py-2 text-left">Zona</th>
                {[1, 2, 3, 4, 5].map((w) => (
                  <th key={w} className="px-2 py-2 text-right">Sem {w}</th>
                ))}
                <th className="px-2 py-2 text-right">Total kg</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.cliente} className="border-b border-border/60">
                  <td className="px-2 py-1.5 font-medium">{c.cliente}</td>
                  <td className="px-2 py-1.5">{c.lugar}</td>
                  <td className="px-2 py-1.5 text-xs">{c.foranea ? "Foránea" : "Local"}</td>
                  {c.semanas.map((k, i) => (
                    <td key={i} className={`px-2 py-1.5 text-right ${k ? "bg-primary font-semibold text-primary-foreground" : ""}`}>
                      {n(k)}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right font-bold">{n(c.total)}</td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-2 py-8 text-center text-muted-foreground">No hay clientes para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Zonas foráneas" badge={<Badge>{zonas.length}</Badge>}>
        <p className="mb-3 text-xs text-muted-foreground">
          Las facturas cuyo lugar esté en esta lista se suman a zonas foráneas; las demás a zona local.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {zonas.map((z) => (
            <span key={z} className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-semibold">
              {z}
              {user.esAdmin && (
                <button onClick={() => void guardarZonas(zonas.filter((x) => x !== z))} aria-label={`Quitar ${z}`}>
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}
          {zonas.length === 0 && <span className="text-xs text-muted-foreground">Ninguna zona foránea todavía.</span>}
        </div>
        {user.esAdmin ? (
          <div className="flex gap-2">
            <TextInput
              list="lugares-master"
              value={nueva}
              placeholder="Lugar foráneo…"
              onChange={(e) => setNueva(e.target.value)}
            />
            <datalist id="lugares-master">
              {lugares.map((l) => <option key={l} value={l} />)}
            </datalist>
            <Button
              onClick={() => {
                if (!nueva.trim()) return;
                void guardarZonas([...zonas, nueva]);
                setNueva("");
              }}
            >
              Agregar
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Solo el administrador puede modificar esta lista.</p>
        )}
      </Card>
    </>
  );
}

function Resumen({ titulo, t }: { titulo: string; t: Tot }) {
  const total = t.kilos.reduce((a, b) => a + b, 0);
  return (
    <Card title={titulo} badge={<Badge>{n(total) || "0"} kg</Badge>}>
      <div className="grid grid-cols-5 gap-2 text-center">
        {t.kilos.map((k, i) => (
          <div key={i} className="rounded-md bg-muted px-1 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">Sem {i + 1}</p>
            <p className="text-sm font-bold">{n(k) || "0"}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-sm">
        <span>Víveres: <b>{t.cajas}</b> cajas</span>
        <span><b>{t.und}</b> unidades</span>
      </div>
    </Card>
  );
}
