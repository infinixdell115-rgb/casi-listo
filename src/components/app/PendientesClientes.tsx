import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Pencil, Plus, Trash2, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, ComboInput, EmptyState, Field, TextInput, inputClass } from "./ui";
import { api, escucharCambios } from "@/lib/api";
import { useFacturasTodas } from "@/lib/facturas";

interface ProductoPend { producto: string; cantidad: string }
interface Pendiente {
  id: string; creado: string; creado_por: string;
  cliente: string; zona: string; vendedor: string; nota: string; resuelto: boolean;
  productos: ProductoPend[];
}
type Form = Omit<Pendiente, "id" | "creado" | "creado_por">;

const vacio = (): Form => ({ cliente: "", zona: "", vendedor: "", nota: "", resuelto: false, productos: [{ producto: "", cantidad: "" }] });
const uniq = (l: string[]) => Array.from(new Set(l.filter(Boolean))).sort();
const fecha = (iso: string) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; };

/** Clientes que quedaron pendientes por mercancía que no salió en su último despacho. */
export function PendientesClientes() {
  const [lista, setLista] = useState<Pendiente[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [fCliente, setFCliente] = useState("");
  const [fZona, setFZona] = useState("");
  const [fVend, setFVend] = useState("");
  const [fEstado, setFEstado] = useState<"pendiente" | "resuelto" | "">("pendiente");
  const { lista: facturas } = useFacturasTodas();

  const cargar = useCallback(() => {
    api<Pendiente[]>("/api/pendientes").then(setLista).catch((e: Error) => toast.error(e.message));
  }, []);
  useEffect(() => { cargar(); return escucharCambios(cargar); }, [cargar]);

  const clientes = useMemo(() => uniq(facturas.map((f) => f.cliente)), [facturas]);
  const zonas = useMemo(() => uniq([...facturas.map((f) => f.lugar), ...lista.map((p) => p.zona)]), [facturas, lista]);
  const vendedores = useMemo(() => uniq([...facturas.map((f) => f.vendedor), ...lista.map((p) => p.vendedor)]), [facturas, lista]);

  const filtrados = lista.filter((p) =>
    (!fEstado || (fEstado === "resuelto") === p.resuelto) &&
    (!fZona || p.zona === fZona) && (!fVend || p.vendedor === fVend) &&
    p.cliente.toLowerCase().includes(fCliente.toLowerCase()),
  );

  const guardar = async () => {
    if (!form) return;
    if (!form.cliente.trim()) { toast.error("Escribe el nombre del cliente."); return; }
    const body = { ...form, productos: form.productos.filter((x) => x.producto.trim()) };
    if (body.productos.length === 0) { toast.error("Agrega al menos un producto pendiente."); return; }
    try {
      await api(editId ? `/api/pendientes/${editId}` : "/api/pendientes", { method: editId ? "PUT" : "POST", body });
      toast.success(editId ? "Pendiente actualizado." : "Pendiente registrado.");
      setForm(null); setEditId(null); cargar();
    } catch (e) { toast.error((e as Error).message); }
  };
  const cambiarEstado = async (p: Pendiente) => {
    try { await api(`/api/pendientes/${p.id}`, { method: "PUT", body: { ...p, resuelto: !p.resuelto } }); cargar(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const borrar = async (p: Pendiente) => {
    if (!confirm(`¿Eliminar el pendiente de ${p.cliente}?`)) return;
    try { await api(`/api/pendientes/${p.id}`, { method: "DELETE" }); cargar(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const setProd = (i: number, k: keyof ProductoPend, v: string) =>
    setForm((f) => f && { ...f, productos: f.productos.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });

  return (
    <>
      <Card
        title="Clientes pendientes por mercancía"
        badge={<Badge>{lista.filter((p) => !p.resuelto).length} pendientes</Badge>}
        actions={<Button onClick={() => { setForm(vacio()); setEditId(null); }}><Plus className="size-4" />Añadir pendiente</Button>}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Estado">
            <select className={inputClass} value={fEstado} onChange={(e) => setFEstado(e.target.value as typeof fEstado)}>
              <option value="pendiente">Por facturar</option>
              <option value="resuelto">Ya resueltos</option>
              <option value="">Todos</option>
            </select>
          </Field>
          <Field label="Cliente"><TextInput value={fCliente} onChange={(e) => setFCliente(e.target.value)} placeholder="Buscar" /></Field>
          <Field label="Zona">
            <select className={inputClass} value={fZona} onChange={(e) => setFZona(e.target.value)}>
              <option value="">Todas</option>{zonas.map((z) => <option key={z}>{z}</option>)}
            </select>
          </Field>
          <Field label="Vendedor">
            <select className={inputClass} value={fVend} onChange={(e) => setFVend(e.target.value)}>
              <option value="">Todos</option>{vendedores.map((z) => <option key={z}>{z}</option>)}
            </select>
          </Field>
        </div>

        {filtrados.length === 0 ? (
          <EmptyState>No hay clientes pendientes.</EmptyState>
        ) : (
          <div className="mt-4 space-y-3">
            {filtrados.map((p) => (
              <div key={p.id} className={`rounded-md border border-border p-3 ${p.resuelto ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-sm">{p.cliente}</b>
                  {p.zona && <span className="text-xs text-muted-foreground">· {p.zona}</span>}
                  {p.vendedor && <span className="text-xs text-muted-foreground">· {p.vendedor}</span>}
                  <span className="text-xs text-muted-foreground">· {fecha(p.creado)}</span>
                  {p.resuelto && <Badge>Resuelto</Badge>}
                  <div className="ml-auto flex gap-1">
                    <Button variant="ghost" onClick={() => void cambiarEstado(p)}>
                      {p.resuelto ? <><Undo2 className="size-4" />Volver a pendiente</> : <><CheckCircle2 className="size-4" />Marcar resuelto</>}
                    </Button>
                    <Button variant="ghost" aria-label="Editar" onClick={() => { setEditId(p.id); setForm({ cliente: p.cliente, zona: p.zona, vendedor: p.vendedor, nota: p.nota, resuelto: p.resuelto, productos: p.productos.length ? p.productos : [{ producto: "", cantidad: "" }] }); }}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" aria-label="Eliminar" onClick={() => void borrar(p)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
                <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  {p.productos.map((x, i) => <li key={i}>• {x.producto}{x.cantidad && <span className="text-muted-foreground"> — {x.cantidad}</span>}</li>)}
                </ul>
                {p.nota && <p className="mt-1 text-xs text-muted-foreground">{p.nota}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-6" onClick={() => setForm(null)}>
          <div className="flex max-h-full w-full max-w-2xl flex-col rounded-lg bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-3">
              <span className="text-sm font-semibold uppercase">{editId ? "Editar pendiente" : "Añadir pendiente"}</span>
              <Button variant="ghost" onClick={() => setForm(null)}><X className="size-4" /></Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Cliente"><ComboInput options={clientes} value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} /></Field>
                <Field label="Zona"><ComboInput options={zonas} value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })} /></Field>
                <Field label="Vendedor"><ComboInput options={vendedores} value={form.vendedor} onChange={(e) => setForm({ ...form, vendedor: e.target.value })} /></Field>
              </div>
              <p className="mt-4 mb-2 text-sm font-semibold">Productos a facturar en el próximo despacho</p>
              <div className="space-y-2">
                {form.productos.map((x, i) => (
                  <div key={i} className="flex gap-2">
                    <TextInput placeholder="Producto" value={x.producto} onChange={(e) => setProd(i, "producto", e.target.value)} />
                    <TextInput className="w-40" placeholder="Cantidad / kilos" value={x.cantidad} onChange={(e) => setProd(i, "cantidad", e.target.value)} />
                    <Button variant="ghost" aria-label="Quitar" onClick={() => setForm({ ...form, productos: form.productos.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="mt-2" onClick={() => setForm({ ...form, productos: [...form.productos, { producto: "", cantidad: "" }] })}><Plus className="size-4" />Otro producto</Button>
              <Field label="Nota (opcional)" className="mt-4"><TextInput value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-3">
              <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
              <Button onClick={() => void guardar()}>Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
