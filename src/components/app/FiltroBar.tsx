import { Field, TextInput, inputClass } from "./ui";
import type { Periodo } from "@/lib/filtros";

export interface FiltroState {
  periodo: Periodo;
  desde: string;
  hasta: string;
  usuario: string;
  vendedor: string;
  cliente: string;
  zona: string;
}
export const filtroInicial: FiltroState = { periodo: "todo", desde: "", hasta: "", usuario: "", vendedor: "", cliente: "", zona: "" };

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Últimos 7 días" },
  { id: "mes", label: "Este mes" },
  { id: "anio", label: "Este año" },
  { id: "todo", label: "Todo" },
  { id: "rango", label: "Rango" },
];

export function FiltroBar({
  f,
  set,
  usuarios,
  vendedores,
  zonas,
}: {
  f: FiltroState;
  set: (f: FiltroState) => void;
  usuarios?: string[] | undefined;
  vendedores: string[];
  zonas?: string[];
}) {
  const up = (p: Partial<FiltroState>) => set({ ...f, ...p });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            onClick={() => up({ periodo: p.id })}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
              f.periodo === p.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {f.periodo === "rango" && (
          <>
            <Field label="Desde">
              <TextInput type="date" value={f.desde} onChange={(e) => up({ desde: e.target.value })} />
            </Field>
            <Field label="Hasta">
              <TextInput type="date" value={f.hasta} onChange={(e) => up({ hasta: e.target.value })} />
            </Field>
          </>
        )}
        {usuarios && (
          <Field label="Usuario">
            <select className={inputClass} value={f.usuario} onChange={(e) => up({ usuario: e.target.value })}>
              <option value="">Todos</option>
              {usuarios.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
        )}
        <Field label="Vendedor">
          <select className={inputClass} value={f.vendedor} onChange={(e) => up({ vendedor: e.target.value })}>
            <option value="">Todos</option>
            {vendedores.map((u) => <option key={u}>{u}</option>)}
          </select>
        </Field>
        {zonas && (
          <Field label="Zona">
            <select className={inputClass} value={f.zona} onChange={(e) => up({ zona: e.target.value })}>
              <option value="">Todas</option>
              {zonas.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
        )}
        <Field label="Cliente">
          <TextInput value={f.cliente} placeholder="Buscar cliente" onChange={(e) => up({ cliente: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

export const uniq = (list: string[]) => Array.from(new Set(list.filter(Boolean).map((s) => s.toUpperCase().trim()))).sort();
