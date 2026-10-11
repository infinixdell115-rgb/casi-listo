import { useEffect, useState } from "react";
import { api, getRed, getToken, setToken, subscribeUnauthorized, type Usuario } from "@/lib/api";
import { Login } from "@/components/app/Login";
import { Usuarios } from "@/components/app/Usuarios";
import { Supervision } from "@/components/app/Supervision";
import { Anulaciones } from "@/components/app/Anulaciones";
import {
  BarChart3,
  ClipboardList,
  FileSpreadsheet,
  FolderClosed,
  Hourglass,
  Megaphone,
  PencilLine,
  Truck,
  Scale,
  DollarSign,
  Clock,
  Ban,
  LogOut,
  DatabaseBackup,
  Users,
  Eye,
  Contact,
  List,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { StoreProvider, useStore } from "@/lib/store";
import { Button, Card } from "@/components/app/ui";
import { Pendientes, Registrar } from "@/components/app/Registrar";
import { ListaFacturas } from "@/components/app/ListaFacturas";
import { PendientesClientes } from "@/components/app/PendientesClientes";
import { Despacho } from "@/components/app/Despacho";
import { Novedades } from "@/components/app/Novedades";
import { Carpeta } from "@/components/app/Carpeta";
import { Reportes } from "@/components/app/Reportes";
import { MasterClientes } from "@/components/app/MasterClientes";
import { ChecklistModulo } from "@/components/app/Checklist";

export function App() {
  return (
    <>
      <AuthGate />
      <Toaster richColors position="top-right" />
    </>
  );
}

function AuthGate() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const off = subscribeUnauthorized(() => { setToken(null); setUser(null); });
    void (async () => {
      const red = await getRed();
      if (red.config && getToken()) {
        try { setUser(await api<Usuario>("/api/yo")); } catch { setToken(null); }
      }
      setListo(true);
    })();
    return off;
  }, []);
  if (!listo) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Cargando…</div>;
  if (!user) return <Login onEntrar={setUser} />;
  return (
    <StoreProvider key={user.id} user={user} onSalir={() => setUser(null)}>
      <Shell />
    </StoreProvider>
  );
}

type Modulo = "supervision" | "usuarios" | "anulaciones" | "registrar" | "pendientes" | "novedades" | "despacho" | "carpeta" | "reportes" | "checklist" | "master" | "lista";

const NAV: { id: Modulo; label: string; icon: typeof PencilLine }[] = [
  { id: "registrar", label: "Registrar", icon: PencilLine },
  { id: "lista", label: "Lista de facturas", icon: List },
  { id: "pendientes", label: "Pendientes", icon: Hourglass },
  { id: "novedades", label: "Novedades", icon: Megaphone },
  { id: "despacho", label: "Despacho", icon: Truck },
  { id: "anulaciones", label: "Anulaciones", icon: Ban },
  { id: "carpeta", label: "Facturas en carpeta", icon: FolderClosed },
  { id: "reportes", label: "Reportes", icon: BarChart3 },
  { id: "checklist", label: "CheckList", icon: ClipboardList },
  { id: "master", label: "Master de clientes", icon: Contact },
];

function Shell() {
  const { semana, setSemana, pendings, invoices, user, cerrarSesion, cargando } = useStore();
  const nav = [
    ...NAV.filter((n) => user.esAdmin || (user.modulos as string[]).includes(n.id)),
    ...(user.esAdmin ? [{ id: "supervision" as Modulo, label: "Supervisión", icon: Eye }, { id: "usuarios" as Modulo, label: "Usuarios", icon: Users }] : []),
  ];
  const [modulo, setModulo] = useState<Modulo | null>(nav[0]?.id ?? null);

  const totalKilos = invoices.reduce((a, b) => a + (b.kilos || 0), 0);
  const totalVentas = invoices.reduce((a, b) => a + (b.venta || 0), 0);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-6">
          <h1 className="text-lg font-bold uppercase tracking-wide text-sidebar-accent-foreground">
            Facturación
          </h1>
          <p className="text-[11px] text-sidebar-foreground/70">Relación de Ventas Diarias</p>
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = modulo === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setModulo(n.id)}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60"
                }`}
              >
                <Icon className="size-4" />
                {n.label}
              </button>
            );
          })}
        </nav>

        {user.esAdmin && <div className="mt-auto space-y-2 p-3">
          <SideStat
            icon={<Clock className="size-4" />}
            value={String(pendings.length)}
            label="Registros pendientes"
          />
          <SideStat
            icon={<Scale className="size-4" />}
            value={totalKilos.toFixed(2)}
            label="Total kilos"
          />
          <SideStat
            icon={<DollarSign className="size-4" />}
            value={totalVentas.toFixed(2)}
            label="Total ventas ($)"
          />
        </div>}
      </aside>

      <main className="flex-1 overflow-x-hidden p-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <Card
            title="Sistema de facturación"
            actions={
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{user.usuario}</span>
                {user.esAdmin && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void api<{ ruta: string }>("/api/respaldo", { method: "POST" })
                        .then((r) => toast.success(`Respaldo guardado en: ${r.ruta}`))
                        .catch((e) => toast.error((e as Error).message))
                    }
                  >
                    <DatabaseBackup className="size-4" /> Hacer respaldo
                  </Button>
                )}
                <Button variant="outline" onClick={() => void cerrarSesion()}>
                  <LogOut className="size-4" /> Salir
                </Button>
              </div>
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              <FileSpreadsheet className="size-4 text-primary" />
              <span className="text-xs text-muted-foreground">
                {cargando ? "Cargando…" : "Todo se guarda en la PC servidor y se ve igual en todas las PC."}
              </span>
            </div>
          </Card>

          {modulo === "registrar" && (
            <>
              <Registrar />
              <Pendientes />
            </>
          )}
          {modulo === "pendientes" && <PendientesClientes />}
          {modulo === "lista" && <ListaFacturas />}
          {modulo === "novedades" && <Novedades />}
          {modulo === "despacho" && <Despacho />}
          {modulo === "carpeta" && <Carpeta />}
          {modulo === "anulaciones" && <Anulaciones />}
          {modulo === "reportes" && <Reportes />}
          {modulo === "checklist" && <ChecklistModulo />}
          {modulo === "master" && <MasterClientes />}
          {modulo === "supervision" && user.esAdmin && <Supervision />}
          {modulo === "usuarios" && user.esAdmin && <Usuarios />}
          {modulo === null && <Card title="Sin módulos">El administrador aún no te ha asignado módulos.</Card>}
        </div>
      </main>
    </div>
  );
}

function SideStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-sidebar-primary px-3 py-2.5 text-sidebar-primary-foreground">
      <div>
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="text-[10px] uppercase opacity-90">{label}</p>
      </div>
      {icon}
    </div>
  );
}
