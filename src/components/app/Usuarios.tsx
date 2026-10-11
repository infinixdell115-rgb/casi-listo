import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, MODULOS, type ModuloId, type Usuario } from "@/lib/api";
import { Button, Card, Field, TextInput } from "./ui";

function Modulos({ value, onChange }: { value: ModuloId[]; onChange: (m: ModuloId[]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {MODULOS.map((m) => (
        <label key={m.id} className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={value.includes(m.id)}
            onChange={(e) => onChange(e.target.checked ? [...value, m.id] : value.filter((x) => x !== m.id))}
          />
          {m.label}
        </label>
      ))}
    </div>
  );
}

export function Usuarios() {
  const [lista, setLista] = useState<Usuario[]>([]);
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [mods, setMods] = useState<ModuloId[]>([]);

  const cargar = useCallback(() => {
    api<Usuario[]>("/api/usuarios").then(setLista).catch((e: Error) => toast.error(e.message));
  }, []);
  useEffect(cargar, [cargar]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/usuarios", { method: "POST", body: { usuario, clave, modulos: mods } });
      toast.success(`Usuario ${usuario} creado. Pásale su usuario y contraseña.`);
      setUsuario(""); setClave(""); setMods([]);
      cargar();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const patch = async (u: Usuario, body: Record<string, unknown>, msg: string) => {
    try {
      await api(`/api/usuarios/${u.id}`, { method: "PATCH", body });
      toast.success(msg);
      cargar();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <>
      <Card title="Crear usuario">
        <form onSubmit={(e) => void crear(e)} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Usuario">
              <TextInput value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="ej. carlos" />
            </Field>
            <Field label="Contraseña">
              <TextInput value={clave} onChange={(e) => setClave(e.target.value)} />
            </Field>
          </div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Módulos que podrá usar</p>
          <Modulos value={mods} onChange={setMods} />
          <Button type="submit" className="self-start">Crear usuario</Button>
        </form>
      </Card>

      <Card title="Usuarios">
        <div className="flex flex-col divide-y divide-border">
          {lista.map((u) => (
            <FilaUsuario key={u.id} u={u} onPatch={patch} onBorrar={async () => {
              if (!confirm(`¿Eliminar el usuario ${u.usuario}?`)) return;
              try { await api(`/api/usuarios/${u.id}`, { method: "DELETE" }); cargar(); }
              catch (err) { toast.error((err as Error).message); }
            }} />
          ))}
        </div>
      </Card>
    </>
  );
}

function FilaUsuario({ u, onPatch, onBorrar }: {
  u: Usuario;
  onPatch: (u: Usuario, b: Record<string, unknown>, m: string) => Promise<void>;
  onBorrar: () => Promise<void>;
}) {
  const [mods, setMods] = useState<ModuloId[]>(u.modulos);
  const [nueva, setNueva] = useState("");
  const cambiado = mods.slice().sort().join() !== u.modulos.slice().sort().join();
  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-sm">{u.usuario}</b>
        {u.esAdmin && <span className="rounded bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">ADMINISTRADOR</span>}
        {!u.activo && <span className="rounded bg-destructive px-2 py-0.5 text-[10px] text-destructive-foreground">DESACTIVADO</span>}
      </div>
      {!u.esAdmin && <Modulos value={mods} onChange={setMods} />}
      <div className="flex flex-wrap items-center gap-2">
        {!u.esAdmin && cambiado && (
          <Button onClick={() => void onPatch(u, { modulos: mods }, "Permisos guardados.")}>Guardar permisos</Button>
        )}
        <TextInput className="h-8 w-40" placeholder="Nueva contraseña" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        <Button variant="outline" onClick={() => { void onPatch(u, { clave: nueva }, "Contraseña cambiada."); setNueva(""); }} disabled={!nueva}>
          Cambiar contraseña
        </Button>
        {!u.esAdmin && (
          <>
            <Button variant="outline" onClick={() => void onPatch(u, { activo: !u.activo }, u.activo ? "Usuario desactivado." : "Usuario activado.")}>
              {u.activo ? "Desactivar" : "Activar"}
            </Button>
            <Button variant="outline" onClick={() => void onBorrar()}>Eliminar</Button>
          </>
        )}
      </div>
    </div>
  );
}
