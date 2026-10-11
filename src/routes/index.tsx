import { createFileRoute } from "@tanstack/react-router";
import { App } from "@/components/app/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Facturación y Despacho — Inversiones El Cibao" },
      {
        name: "description",
        content:
          "Registro de ventas diarias y relaciones de despacho sobre el mismo archivo de Excel de la semana.",
      },
      { property: "og:title", content: "Facturación y Despacho — Inversiones El Cibao" },
      {
        property: "og:description",
        content:
          "Registra facturas, arma la relación de despacho e imprime las planillas en PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});
