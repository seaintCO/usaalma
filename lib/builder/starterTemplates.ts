import type { BuilderStarterKey } from "./types";

export type BuilderStarter = {
  key: BuilderStarterKey;
  labelEn: string;
  labelEs: string;
  descriptionEn: string;
  descriptionEs: string;
  directory: string;
};

export const BUILDER_STARTERS: Record<BuilderStarterKey, BuilderStarter> = {
  landing_page: {
    key: "landing_page",
    labelEn: "Landing page",
    labelEs: "Landing page",
    descriptionEn:
      "A marketing page with sections, lead capture, and clear CTA.",
    descriptionEs:
      "Pagina comercial con secciones, captura de prospectos y llamada a la accion.",
    directory: "starter-landing-page",
  },
  booking_website: {
    key: "booking_website",
    labelEn: "Booking website",
    labelEs: "Sitio de reservas",
    descriptionEn: "A service website shell with inquiry and booking flows.",
    descriptionEs: "Sitio para servicios con solicitudes, reservas y contacto.",
    directory: "starter-booking-website",
  },
  client_portal: {
    key: "client_portal",
    labelEn: "Client portal shell",
    labelEs: "Portal de clientes",
    descriptionEn:
      "A private portal shell with dashboard, documents, and tasks.",
    descriptionEs: "Portal privado con panel, documentos y tareas.",
    directory: "starter-client-portal",
  },
  internal_dashboard: {
    key: "internal_dashboard",
    labelEn: "Internal dashboard shell",
    labelEs: "Panel interno",
    descriptionEn:
      "A simple operational dashboard with tables and status views.",
    descriptionEs: "Panel operativo con tablas, estados y vistas internas.",
    directory: "starter-internal-dashboard",
  },
};

export function isBuilderStarterKey(
  value: unknown,
): value is BuilderStarterKey {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(BUILDER_STARTERS, value)
  );
}
