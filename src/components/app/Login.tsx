import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, getRed, setRed, setToken, type RedInfo, type Usuario } from "@/lib/api";
import { Button, Card, Field, TextInput } from "./ui";

export function Login({ onEntrar }: { onEntrar: (u: Usuario) => void }) {
  const [red, setRedInfo] = useState<RedInfo | null>(null);
  const [cambiar, setCambiar] = useState(false);
  const [estado, setEstado] = useState<{ configurado: boolean } | null>(null);
  const [errorConexion, setErrorConexion] = useState<string | null>(null);

  useEffect(() => {
    void getRed().then(setRedInfo);
  }, []);

  useEffect(() => {
    if (!red?.config || cambiar) return;
    setEstado(null);
    setErrorConexion(null);
    api<{ configurado: boolean }>("/api/estado")
      .then(setEstado)
      .catch((e: Error) => setErrorConexion(e.message));
  }, [red, cambiar]);

  if (!red) return <Centro>Cargando…</Centro>;
  if (!red.config || cambiar)
    return (
      <ConfigRed
        actual={red}
        onListo={(r) => {
          setRedInfo(r);
          setCambiar(false);
        }}
      />
    );

  const pie = (
    <div className="flex flex-col gap-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
      {red.config.modo === "servidor" ? (
        <span>
          Esta PC es el servidor.{" "}
          {red.ips.length > 0 && <>Las demás PC deben conectarse a: <b>{red.ips.join(" o ")}</b></>}
        </span>
      ) : (
        <span>Conectado al servidor: <b>{red.config.servidor}</b></span>
      )}
      <button type="button" className="self-start text-primary underline" onClick={() => setCambiar(true)}>
        Cambiar conexión
      </button>
    </div>
  );

  if (errorConexion)
    return (
      <Centro>
        <Card title="Sin conexión" className="w-full max-w-sm">
          <div className="flex flex-col gap-4">
            <p className="text-sm">{errorConexion}</p>
            <Button onClick={() => setRedInfo({ ...red })}>Reintentar</Button>
            {pie}
          </div>
        </Card>
      </Centro>
    );
  if (!estado) return <Centro>Conectando…</Centro>;
  if (!estado.configurado) return <CrearAdmin onListo={() => setEstado({ configurado: true })} pie={pie} />;
  return <FormEntrar onEntrar={onEntrar} pie={pie} />;
}

function Centro({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function ConfigRed({ actual, onListo }: { actual: RedInfo; onListo: (r: RedInfo) => void }) {
  const [modo, setModo] = useState<"servidor" | "cliente">(actual.config?.modo ?? "cliente");
  const [host, setHost] = useState(actual.config?.servidor ?? "");
  const [busy, setBusy] = useState(false);
  const guardar = async () => {
    if (modo === "cliente" && !host.trim()) {
      toast.error("Escribe la dirección de la PC servidor.");
      return;
    }
    setBusy(true);
    const r = await setRed(modo === "servidor" ? { modo } : { modo, servidor: host.trim() });
    setBusy(false);
    if (r.error) toast.error("No se pudo iniciar el servidor: " + r.error);
    else onListo(r);
  };
  return (
    <Centro>
      <Card title="Conexión de esta PC" className="w-full max-w-md">
        <div className="flex flex-col gap-4 text-foreground">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input type="radio" checked={modo === "servidor"} onChange={() => setModo("servidor")} className="mt-1" />
            <span>
              <b>Esta PC es el servidor</b>
              <br />
              <span className="text-xs text-muted-foreground">Aquí se guardan todos los datos. Debe estar encendida y con el programa abierto para que las demás trabajen.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input type="radio" checked={modo === "cliente"} onChange={() => setModo("cliente")} className="mt-1" />
            <span>
              <b>Conectarme a la PC servidor</b>
              <br />
              <span className="text-xs text-muted-foreground">Escribe la dirección que muestra la PC servidor (ej. 192.168.1.10).</span>
            </span>
          </label>
          {modo === "cliente" && (
            <Field label="Dirección de la PC servidor">
              <TextInput value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.10" />
            </Field>
          )}
          <Button onClick={() => void guardar()} disabled={busy}>Guardar</Button>
        </div>
      </Card>
    </Centro>
  );
}

function CrearAdmin({ onListo, pie }: { onListo: () => void; pie: React.ReactNode }) {
  const [clave, setClave] = useState("");
  const [clave2, setClave2] = useState("");
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clave.length < 4) return void toast.error("La contraseña debe tener al menos 4 caracteres.");
    if (clave !== clave2) return void toast.error("Las contraseñas no coinciden.");
    try {
      await api("/api/setup", { method: "POST", body: { clave } });
      toast.success("Administrador ADMINISTRADOR creado. Ya puedes entrar.");
      onListo();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  return (
    <Centro>
      <Card title="Primera vez: administrador" className="w-full max-w-sm">
        <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-4 text-foreground">
          <p className="text-xs text-muted-foreground">Elige la contraseña del administrador <b>FREDDER</b>.</p>
          <Field label="Contraseña">
            <TextInput type="password" value={clave} onChange={(e) => setClave(e.target.value)} />
          </Field>
          <Field label="Repite la contraseña">
            <TextInput type="password" value={clave2} onChange={(e) => setClave2(e.target.value)} />
          </Field>
          <Button type="submit">Crear administrador</Button>
          {pie}
        </form>
      </Card>
    </Centro>
  );
}

function FormEntrar({ onEntrar, pie }: { onEntrar: (u: Usuario) => void; pie: React.ReactNode }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      const r = await api<{ token: string; usuario: Usuario }>("/api/login", {
        method: "POST",
        body: { usuario, clave },
      });
      setToken(r.token);
      onEntrar(r.usuario);
    } catch (err) {
      toast.error((err as Error).message);
    }
    setCargando(false);
  };
  return (
    <Centro>
      <Card title="Entrar al sistema" className="w-full max-w-sm">
        <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-4 text-foreground">
          <p className="text-xs text-muted-foreground">Facturación y Despacho · Inversiones El Cibao</p>
          <Field label="Usuario">
            <TextInput value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
          </Field>
          <Field label="Contraseña">
            <TextInput type="password" value={clave} onChange={(e) => setClave(e.target.value)} />
          </Field>
          <Button type="submit" disabled={cargando}>Entrar</Button>
          <p className="text-[11px] text-muted-foreground">Las cuentas las crea el administrador.</p>
          {pie}
        </form>
      </Card>
    </Centro>
  );
}
