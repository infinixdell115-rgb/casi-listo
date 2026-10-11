import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Printer, Save, Scale, Trash2, X } from "lucide-react";
import { ChecklistKilos, ChecklistReporte } from "./ChecklistReporte";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { deleteChecklist, listChecklists, printPdf, saveChecklist, updateChecklist } from "@/lib/desktop";
import { buildChecklistPdf, checklistFileName, CHECKLIST_ROWS } from "@/lib/checklistPdf";
import type { Checklist, ChecklistDatos } from "@/lib/types";
import { Button, Card, ComboInput, EmptyState, Field, TextInput, inputClass } from "@/components/app/ui";

function datosVacios(): ChecklistDatos {
  const d = new Date();
  return {
    jefe: "",
    vendedor: "",
    direccion: "",
    cliente: "",
    factura: "",
    dia: String(d.getDate()),
    mes: String(d.getMonth() + 1),
    anio: String(d.getFullYear()),
    items: Array.from({ length: CHECKLIST_ROWS }, () => ({ cant: "", descripcion: "" })),
  };
}

function nuevo(): Checklist {
  const d = new Date();
  return {
    id: "",
    creado: "",
    segundo: datosVacios(),
    jefe: "",
    vendedor: "",
    direccion: "",
    cliente: "",
    factura: "",
    dia: String(d.getDate()),
    mes: String(d.getMonth() + 1),
    anio: String(d.getFullYear()),
    items: Array.from({ length: CHECKLIST_ROWS }, () => ({ cant: "", descripcion: "" })),
  };
}

const fechaCreado = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
const isoDia = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function ChecklistModulo() {
  const { invoices } = useStore();
  const [form, setForm] = useState<Checklist>(nuevo);
  const [lista, setLista] = useState<Checklist[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fFecha, setFFecha] = useState("");
  const [fCliente, setFCliente] = useState("");
  const [fVendedor, setFVendedor] = useState("");
  const [fFactura, setFFactura] = useState("");
  const [fEstado, setFEstado] = useState<"" | "pendiente" | "completado">("");
  const [kilosDe, setKilosDe] = useState<Checklist | null>(null);

  const recargar = () => void listChecklists().then(setLista);
  useEffect(recargar, []);

  const [lado, setLado] = useState<1 | 2>(1);
  const actual: ChecklistDatos = lado === 1 ? form : (form.segundo ?? datosVacios());
  const patch = (p: Partial<ChecklistDatos>) =>
    setForm((f) =>
      lado === 1 ? { ...f, ...p } : { ...f, segundo: { ...(f.segundo ?? datosVacios()), ...p } },
    );
  const set = (k: keyof ChecklistDatos, v: string) => patch({ [k]: v } as Partial<ChecklistDatos>);
  const setItem = (i: number, k: "cant" | "descripcion", v: string) =>
    patch({ items: actual.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) });

  const elegirFactura = (id: string) => {
    const inv = invoices.find((x) => x.id === id);
    if (!inv) return;
    const [y, m, d] = (inv.fecha || "").split("-");
    patch({
      cliente: inv.cliente,
      vendedor: inv.vendedor,
      direccion: inv.lugar,
      ...(y ? { anio: y, mes: String(Number(m)), dia: String(Number(d)) } : {}),
    });
  };

  const vista = async (c: Checklist) => {
    const bytes = await buildChecklistPdf(c);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" })));
  };
  const imprimir = async (c: Checklist) => printPdf(await buildChecklistPdf(c), false);
  const guardar = async (c: Checklist) => {
    const rec: Checklist = {
      ...c,
      id: c.id || crypto.randomUUID(),
      creado: c.creado || new Date().toISOString(),
      estado: c.estado ?? "pendiente",
    };
    const bytes = await buildChecklistPdf(rec);
    await saveChecklist(rec, checklistFileName(rec), bytes);
    toast.success("Checklist guardado en Documentos / CheckList creados.");
    recargar();
    return rec;
  };

  const guardarNuevo = async () => {
    if (!form.cliente) {
      toast.error("Escribe el cliente.");
      return;
    }
    await guardar(form);
    setForm(nuevo());
    setLado(1);
  };

  const borrar = async (c: Checklist) => {
    if (!confirm(`¿Eliminar el checklist de ${c.cliente || "este cliente"}? Sus kilos dejarán de contar en el reporte.`)) return;
    try {
      await deleteChecklist(c.id);
      toast.success("Checklist eliminado.");
      setSelId(null);
      recargar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const actualizar = async (c: Checklist) => {
    try {
      await updateChecklist(c);
      toast.success("Reporte actualizado.");
      recargar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const filtrados = useMemo(
    () =>
      lista.filter(
        (c) =>
          (!fFecha || isoDia(c.creado) === fFecha) &&
          (!fEstado || (c.estado ?? "pendiente") === fEstado) &&
          [c.cliente, c.segundo?.cliente ?? ""].some((x) => x.toLowerCase().includes(fCliente.toLowerCase())) &&
          [c.vendedor, c.segundo?.vendedor ?? ""].some((x) => x.toLowerCase().includes(fVendedor.toLowerCase())) &&
          (!fFactura || [c.factura, c.segundo?.factura ?? ""].some((x) => (x ?? "").includes(fFactura.trim()))),
      ),
    [lista, fFecha, fCliente, fVendedor, fEstado, fFactura],
  );
  const sel = lista.find((c) => c.id === selId) ?? null;
  const vendedores = useMemo(() => [...new Set(invoices.map((i) => i.vendedor).filter(Boolean))], [invoices]);

  return (
    <>
      <Card title="Crear checklist">
        <div className="mb-4 flex gap-2">
          {([1, 2] as const).map((n) => (
            <Button key={n} variant={lado === n ? "primary" : "outline"} onClick={() => setLado(n)}>
              {n === 1 ? "Primer checklist" : "Segundo checklist"}
            </Button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {invoices.length > 0 && (
            <Field label="Llenar desde una factura registrada (opcional)" className="md:col-span-2">
              <select className={inputClass} value="" onChange={(e) => elegirFactura(e.target.value)}>
                <option value="">— Elegir factura —</option>
                {invoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.factura} · {i.cliente} · {i.vendedor}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Vendedor">
            <ComboInput options={vendedores} value={actual.vendedor} onChange={(e) => set("vendedor", e.target.value)} />
          </Field>
          <Field label="Dirección / zona">
            <TextInput value={actual.direccion} onChange={(e) => set("direccion", e.target.value)} />
          </Field>
          <Field label="Cliente">
            <TextInput value={actual.cliente} onChange={(e) => set("cliente", e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Día"><TextInput value={actual.dia} onChange={(e) => set("dia", e.target.value)} /></Field>
            <Field label="Mes"><TextInput value={actual.mes} onChange={(e) => set("mes", e.target.value)} /></Field>
            <Field label="Año"><TextInput value={actual.anio} onChange={(e) => set("anio", e.target.value)} /></Field>
          </div>
        </div>

        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-muted-foreground">
              <th className="w-24 pb-2">Cant</th>
              <th className="pb-2">Descripción del pedido</th>
              <th className="w-24 pb-2">Peso</th>
            </tr>
          </thead>
          <tbody>
            {actual.items.map((it, i) => (
              <tr key={i}>
                <td className="pr-2 pb-1.5"><TextInput value={it.cant} onChange={(e) => setItem(i, "cant", e.target.value)} /></td>
                <td className="pr-2 pb-1.5"><TextInput value={it.descripcion} onChange={(e) => setItem(i, "descripcion", e.target.value)} /></td>
                <td className="pb-1.5 text-xs text-muted-foreground">A lápiz</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => void vista(form)}><Eye className="size-4" />Vista previa</Button>
          <Button variant="outline" onClick={() => void imprimir(form)}><Printer className="size-4" />Imprimir</Button>
          <Button onClick={() => void guardarNuevo()}><Save className="size-4" />Guardar</Button>
        </div>
      </Card>

      <Card title="Checklist guardados">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Estado">
            <select className={inputClass} value={fEstado} onChange={(e) => setFEstado(e.target.value as typeof fEstado)}>
              <option value="">Todos</option>
              <option value="pendiente">Pendientes (sin kilos)</option>
              <option value="completado">Con kilos anotados</option>
            </select>
          </Field>
          <Field label="Fecha"><TextInput type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)} /></Field>
          <Field label="Cliente"><TextInput value={fCliente} onChange={(e) => setFCliente(e.target.value)} /></Field>
          <Field label="Vendedor"><TextInput value={fVendedor} onChange={(e) => setFVendedor(e.target.value)} /></Field>
          <Field label="Factura"><TextInput value={fFactura} onChange={(e) => setFFactura(e.target.value)} /></Field>
        </div>
        {filtrados.length === 0 ? (
          <EmptyState>No hay checklist guardados.</EmptyState>
        ) : (
          <div className="mt-4 max-h-80 overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left text-[11px] uppercase">
                <tr><th className="p-2" /><th className="p-2">Creado</th><th className="p-2">Factura</th><th className="p-2">Cliente</th><th className="p-2">Vendedor</th><th className="p-2">Estado</th></tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id} onClick={() => setSelId(c.id)} className={`cursor-pointer border-t border-border ${selId === c.id ? "bg-primary/10" : "hover:bg-accent"}`}>
                    <td className="p-2"><input type="radio" readOnly checked={selId === c.id} /></td>
                    <td className="p-2">{fechaCreado(c.creado)}</td>
                    <td className="p-2">{c.factura || "—"}{c.segundo?.factura ? ` / ${c.segundo.factura}` : ""}</td>
                    <td className="p-2">{c.cliente}{c.segundo?.cliente ? ` / ${c.segundo.cliente}` : ""}</td>
                    <td className="p-2">{c.vendedor}</td>
                    <td className="p-2">
                      {(c.estado ?? "pendiente") === "completado" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><CheckCircle2 className="size-3.5" />Con kilos</span>
                      ) : (
                        <span className="text-xs font-semibold text-destructive">Pendiente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={!sel} onClick={() => sel && void vista(sel)}><Eye className="size-4" />Vista previa</Button>
          <Button variant="outline" disabled={!sel} onClick={() => sel && void guardar(sel)}><Save className="size-4" />Guardar de nuevo</Button>
          <Button disabled={!sel} onClick={() => sel && void imprimir(sel)}><Printer className="size-4" />Imprimir</Button>
          <Button disabled={!sel} onClick={() => sel && setKilosDe(sel)}><Scale className="size-4" />Anotar / editar kilos</Button>
          <Button variant="danger" disabled={!sel} onClick={() => sel && void borrar(sel)}><Trash2 className="size-4" />Eliminar</Button>
        </div>
      </Card>

      <ChecklistReporte lista={lista} onUpdate={actualizar} />

      {kilosDe && (
        <ChecklistKilos
          checklist={kilosDe}
          onClose={() => setKilosDe(null)}
          onSave={async (c) => {
            try {
              await updateChecklist(c);
              toast.success(c.estado === "completado" ? "Kilos guardados. El checklist quedó completado." : "Kilos guardados.");
              setKilosDe(null);
              recargar();
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-6" onClick={() => setPreview(null)}>
          <div className="flex h-full w-full max-w-5xl flex-col rounded-lg bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between border-b border-border p-3">
              <span className="text-sm font-semibold uppercase">Vista previa del checklist</span>
              <Button variant="ghost" onClick={() => setPreview(null)}><X className="size-4" /></Button>
            </div>
            <iframe title="Vista previa" src={preview} className="flex-1" />
          </div>
        </div>
      )}
    </>
  );
}
