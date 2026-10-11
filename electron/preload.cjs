const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cibao", {
  openExcel: () => ipcRenderer.invoke("open-excel"),
  saveExcel: (path, data) => ipcRenderer.invoke("save-excel", path, data),
  readSidecar: (path) => ipcRenderer.invoke("read-sidecar", path),
  writeSidecar: (path, json) => ipcRenderer.invoke("write-sidecar", path, json),
  savePdf: (name, data) => ipcRenderer.invoke("save-pdf", name, data),
  savePdfBatch: (files) => ipcRenderer.invoke("save-pdf-batch", files),
  saveDespachoExcel: (name, data) => ipcRenderer.invoke("save-despacho-excel", name, data),
  printPdf: (data, landscape) => ipcRenderer.invoke("print-pdf", data, landscape),
  redGet: () => ipcRenderer.invoke("red-get"),
  redSet: (cfg) => ipcRenderer.invoke("red-set", cfg),
  checklistList: () => ipcRenderer.invoke("checklist-list"),
  checklistSave: (record, name, data) => ipcRenderer.invoke("checklist-save", record, name, data),
  reporteSave: (name, data) => ipcRenderer.invoke("reporte-save", name, data),
  reportesList: () => ipcRenderer.invoke("reportes-list"),
  reporteRead: (c, a) => ipcRenderer.invoke("reporte-read", c, a),
  reporteOpenFolder: (c) => ipcRenderer.invoke("reporte-open-folder", c),
});
