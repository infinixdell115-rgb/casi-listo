<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Invoices are grouped by `semana` (Monday date); voided invoices stay in the table with `anulada=true` and are excluded from `invoices` in the store — so totals never count them.
- Data lives in a LAN server embedded in the Electron main process (electron/server.cjs, JSON file in hidden ~/BASE DE DATOS CIBAO, daily + manual backups in ~/RESPALDO CIBAO, no native deps); renderer talks to it via src/lib/api.ts — works without internet on the office network.
- Accounts are created only by the admin; module permissions are enforced server-side per endpoint, not just hidden in the menu.
- Per-user data isolation is enforced in electron/server.cjs via `creado_por` (esMio helper); admins bypass it. Why: users must never receive other users' invoices, novedades or despachos.
- Generated despacho relations are stored server-side (`db.despachos`, snapshot of header + invoices) so they can be filtered and re-printed later. Why: history independent of later invoice edits.
- Invoice lists are always ordered by numeric correlativo (`ordenarPorCorrelativo` in src/lib/facturas.ts, `porCorrelativo` on the server). Why: users file invoices by number, not by entry time.
- Invoice edit/delete are permission flags (`facturas_editar`, `facturas_eliminar`) stored in the same `modulos` list and checked on PUT/DELETE /api/facturas/:id. Why: admin grants them per user.
- "Pendientes" are client-level backorders stored in `db.pendientes` (cliente, zona, vendedor, productos[]), separate from invoices. Why: tracks goods owed on the next dispatch.
- Credit notes (nota_credito on the invoice) never change the stored kilos; toFactura exposes effective kilos as `kilos` and originals as `kilosFacturados`. Why: removing the note restores the original totals.
- The Electron window and Windows package icon are generated from the same embedded Cibao logo used in PDFs. Why: the desktop app must keep one recognizable brand identity.
