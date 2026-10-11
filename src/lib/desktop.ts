import type { Checklist } from "./types";
import { api } from "./api";

export interface OpenedFile {
  path: string | null;
  name: string;
  data: Uint8Array;
}

interface DesktopApi {
  openExcel: () => Promise<{ path: string; name: string; data: number[] } | null>;
  saveExcel: (path: string, data: number[]) => Promise<boolean>;
  readSidecar: (path: string) => Promise<string | null>;
  writeSidecar: (path: string, json: string) => Promise<boolean>;
  savePdf: (name: string, data: number[]) => Promise<string | null>;
  savePdfBatch: (files: { name: string; data: number[] }[]) => Promise<string | null>;
  saveDespachoExcel: (name: string, data: Uint8Array) => Promise<string | null>;
  printPdf: (data: number[], landscape?: boolean) => Promise<boolean>;
  reporteSave: (name: string, data: number[]) => Promise<string>;
  reportesList: () => Promise<{ carpeta: string; archivos: string[] }[]>;
  reporteRead: (carpeta: string, archivo: string) => Promise<number[]>;
  reporteOpenFolder: (carpeta?: string) => Promise<boolean>;
  checklistList: () => Promise<Checklist[]>;
  checklistSave: (record: Checklist, name: string, data: Uint8Array) => Promise<string>;
}

declare global {
  interface Window {
    cibao?: DesktopApi;
  }
}

export const isDesktop = () =>
  typeof window !== "undefined" && typeof window.cibao !== "undefined";

export async function openExcelFile(): Promise<OpenedFile | null> {
  if (isDesktop()) {
    const api = window.cibao;
    if (!api) return null;
    const res = await api.openExcel();
    if (!res) return null;
    return { path: res.path, name: res.name, data: new Uint8Array(res.data) };
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const buf = new Uint8Array(await file.arrayBuffer());
      resolve({ path: null, name: file.name, data: buf });
    };
    input.click();
  });
}

export async function saveExcelFile(
  file: OpenedFile,
  data: Uint8Array,
): Promise<"saved" | "downloaded"> {
  if (isDesktop() && file.path) {
    const api = window.cibao;
    if (!api) return "downloaded";
    await api.saveExcel(file.path, Array.from(data));
    return "saved";
  }
  downloadBytes(data, file.name, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  return "downloaded";
}

export function downloadBytes(data: Uint8Array, name: string, type: string) {
  const blob = new Blob([data as unknown as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function savePdfFiles(files: { name: string; data: Uint8Array }[]) {
  if (isDesktop()) {
    const api = window.cibao;
    if (!api) return null;
    return api.savePdfBatch(
      files.map((f) => ({ name: f.name, data: Array.from(f.data) })),
    );
  }
  files.forEach((f) => downloadBytes(f.data, f.name, "application/pdf"));
  return "browser-download";
}

export async function saveDespachoExcel(name: string, data: Uint8Array) {
  if (isDesktop()) {
    const api = window.cibao;
    if (!api) return null;
    return api.saveDespachoExcel(name, data);
  }
  downloadBytes(data, name, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  return "browser-download";
}

export async function printPdf(data: Uint8Array, landscape = false) {
  if (isDesktop()) {
    const api = window.cibao;
    if (!api) return;
    await api.printPdf(Array.from(data), landscape);
    return;
  }
  const blob = new Blob([data as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.src = url;
  document.body.appendChild(frame);
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  };
}

export async function readSidecar(path: string | null): Promise<string | null> {
  if (isDesktop() && path) return window.cibao?.readSidecar(path) ?? null;
  return null;
}

export async function writeSidecar(path: string | null, json: string) {
  if (isDesktop() && path) await window.cibao?.writeSidecar(path, json);
}


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listChecklists(): Promise<Checklist[]> {
  try {
    const data = await api<{ id: string; datos: Checklist; creado: string }[]>("/api/checklists");
    return data.map((r) => ({ ...r.datos, id: r.id, creado: r.creado }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function saveChecklist(record: Checklist, name: string, data: Uint8Array) {
  const id = UUID_RE.test(record.id) ? record.id : crypto.randomUUID();
  const rec = { ...record, id };
  try {
    await api(`/api/checklists/${id}`, { method: "PUT", body: { datos: rec, creado: rec.creado } });
  } catch (e) {
    throw new Error("No se pudo guardar el checklist: " + (e as Error).message);
  }
  if (isDesktop() && window.cibao) return window.cibao.checklistSave(rec, name, data);
  downloadBytes(data, name, name.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf");
  return "browser-download";
}

/** Actualiza solo el registro (sin volver a crear el PDF), p. ej. al anotar los kilos. */
export async function updateChecklist(record: Checklist) {
  await api(`/api/checklists/${record.id}`, { method: "PUT", body: { datos: record, creado: record.creado } });
}

export async function deleteChecklist(id: string) {
  await api(`/api/checklists/${id}`, { method: "DELETE" });
}

export async function saveReporte(name: string, data: Uint8Array): Promise<string> {
  if (isDesktop() && window.cibao) return window.cibao.reporteSave(name, Array.from(data));
  downloadBytes(data, name, name.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf");
  return "descargas del navegador";
}
export async function listReportes() {
  if (isDesktop() && window.cibao) return window.cibao.reportesList();
  return [];
}
export async function readReporte(carpeta: string, archivo: string) {
  if (!isDesktop() || !window.cibao) return null;
  return new Uint8Array(await window.cibao.reporteRead(carpeta, archivo));
}
export async function openReportesFolder(carpeta?: string) {
  if (isDesktop() && window.cibao) await window.cibao.reporteOpenFolder(carpeta);
}
