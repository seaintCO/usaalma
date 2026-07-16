import { jsPDF } from "jspdf";
import { displayMaterialQuantity } from "@/lib/construction/materials";

type PdfFile = {
  id: string;
  title?: string | null;
  original_filename?: string | null;
  mime_type?: string | null;
  notes?: string | null;
};

type PdfMeasurement = {
  label?: string | null;
  measurement_type?: string | null;
  unit?: string | null;
  base_total?: number | string | null;
  adjusted_total?: number | string | null;
  waste_percentage?: number | string | null;
  notes?: string | null;
};

type PdfMaterial = {
  material_name?: string | null;
  unit?: string | null;
  conversion_factor?: number | string | null;
  calculated_quantity?: number | string | null;
  manual_quantity_override?: number | string | null;
  waste_factor?: number | string | null;
  notes?: string | null;
};

type PdfScope = {
  title?: string | null;
  content?: string | null;
  sort_order?: number | string | null;
};

type PdfCrewItem = {
  title?: string | null;
  body?: string | null;
  completed?: boolean;
};

type PdfCrew = {
  checklist?: PdfCrewItem[];
  work_sequence?: string | null;
  material_summary_notes?: string | null;
  user_safety_notes?: string | null;
  assigned_crew_text?: string | null;
};

type PdfSummary = {
  project: {
    project_name?: string | null;
    jobsite_address?: string | null;
    project_type?: string | null;
    status?: string | null;
    description?: string | null;
  };
  contact?: {
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  } | null;
  company?: {
    name?: string | null;
    website?: string | null;
    industry?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  files?: PdfFile[];
  measurements?: PdfMeasurement[];
  materials?: PdfMaterial[];
  scope?: PdfScope[];
  crew?: PdfCrew | null;
  counts?: Record<string, number>;
  materialTotals?: Record<string, number>;
};

export type ConstructionPdfImage = {
  fileId: string;
  title: string;
  mimeType: string;
  dataUrl: string;
};

const margin = 42;
const pageWidth = 612;
const pageHeight = 792;
const contentWidth = pageWidth - margin * 2;
const footerDisclaimer =
  "Estimate only. Verify all field measurements. Not engineering advice or code compliance. User is responsible for final quantities.";

export function createConstructionPdf({
  summary,
  images,
  generatedAt = new Date(),
}: {
  summary: PdfSummary;
  images?: ConstructionPdfImage[];
  generatedAt?: Date;
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let y = margin;

  function ensureSpace(required: number) {
    if (y + required <= pageHeight - margin - 36) return;
    doc.addPage();
    y = margin;
  }

  function text(
    value: string,
    x: number,
    options: { size?: number; bold?: boolean; color?: string } = {},
  ) {
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(options.size ?? 10);
    doc.setTextColor(options.color ?? "#111111");
    doc.text(value, x, y);
  }

  function wrapped(value: string, x: number, width: number, lineHeight = 13) {
    const lines = doc.splitTextToSize(value || "-", width);
    doc.text(lines, x, y);
    y += lines.length * lineHeight;
  }

  function section(title: string) {
    ensureSpace(54);
    y += 16;
    doc.setDrawColor("#111111");
    doc.setLineWidth(1);
    doc.line(margin, y, margin + contentWidth, y);
    y += 22;
    text(title, margin, { size: 14, bold: true });
    y += 14;
  }

  function labelValue(label: string, value: string) {
    ensureSpace(34);
    text(label, margin, { size: 8, bold: true, color: "#6B7280" });
    y += 12;
    wrapped(value || "-", margin, contentWidth, 12);
    y += 4;
  }

  function table(headers: string[], rows: string[][]) {
    const columnWidth = contentWidth / headers.length;
    ensureSpace(38);
    doc.setFillColor("#F3F4F6");
    doc.rect(margin, y, contentWidth, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor("#111111");
    headers.forEach((header, index) => {
      doc.text(header, margin + index * columnWidth + 6, y + 14, {
        maxWidth: columnWidth - 12,
      });
    });
    y += 26;
    doc.setFont("helvetica", "normal");
    rows.forEach((row) => {
      const wrappedCells = row.map((cell) =>
        doc.splitTextToSize(cell || "-", columnWidth - 12),
      );
      const rowHeight = Math.max(
        24,
        Math.max(...wrappedCells.map((cell) => cell.length)) * 11 + 10,
      );
      ensureSpace(rowHeight + 6);
      doc.setDrawColor("#E5E7EB");
      doc.rect(margin, y, contentWidth, rowHeight);
      wrappedCells.forEach((cell, index) => {
        doc.text(cell, margin + index * columnWidth + 6, y + 14);
      });
      y += rowHeight;
    });
  }

  doc.setFillColor("#111111");
  doc.rect(0, 0, pageWidth, 86, "F");
  doc.setTextColor("#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("ALMA Construction Summary", margin, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated ${formatDate(generatedAt)}`, margin, 62);
  y = 118;

  text(summary.company?.name || "ALMA Construction", margin, {
    size: 16,
    bold: true,
  });
  y += 20;
  wrapped(
    summary.company?.address || summary.company?.website || "",
    margin,
    contentWidth,
  );

  section("Project");
  const contactName = formatContact(summary.contact);
  table(
    ["Project", "Customer", "Jobsite", "Status"],
    [
      [
        summary.project.project_name || "-",
        contactName || summary.company?.name || "-",
        summary.project.jobsite_address || "-",
        [summary.project.project_type, summary.project.status]
          .filter(Boolean)
          .join(" / "),
      ],
    ],
  );
  y += 8;
  labelValue("Description", summary.project.description || "-");

  section("Plans / Photos");
  if (summary.files?.length) {
    table(
      ["Title", "File", "Type", "Notes"],
      summary.files.map((file) => [
        file.title || "-",
        file.original_filename || "-",
        file.mime_type || "-",
        file.notes || "-",
      ]),
    );
  } else {
    labelValue("Plans / Photos", "No plans or photos attached.");
  }

  for (const image of images ?? []) {
    ensureSpace(190);
    text(image.title, margin, { size: 10, bold: true });
    y += 12;
    try {
      doc.addImage(
        image.dataUrl,
        image.mimeType.includes("png") ? "PNG" : "JPEG",
        margin,
        y,
        180,
        135,
      );
      y += 150;
    } catch {
      wrapped(
        "Image preview could not be embedded. Use the private file download in ALMA.",
        margin,
        contentWidth,
      );
      y += 8;
    }
  }

  section("Measurements");
  if (summary.measurements?.length) {
    table(
      ["Label", "Type", "Base", "Adjusted", "Waste"],
      summary.measurements.map((measurement) => [
        measurement.label || "-",
        measurement.measurement_type || "-",
        `${displayMaterialQuantity(measurement.base_total)} ${measurement.unit || ""}`,
        `${displayMaterialQuantity(measurement.adjusted_total)} ${measurement.unit || ""}`,
        `${displayMaterialQuantity(measurement.waste_percentage)}%`,
      ]),
    );
  } else {
    labelValue("Measurements", "No measurements entered.");
  }

  section("Materials");
  if (summary.materials?.length) {
    table(
      ["Material", "Calculated", "Override", "Final", "Waste"],
      summary.materials.map((material) => {
        const finalQuantity =
          material.manual_quantity_override ?? material.calculated_quantity;
        return [
          material.material_name || "-",
          `${displayMaterialQuantity(material.calculated_quantity)} ${material.unit || ""}`,
          material.manual_quantity_override === null ||
          material.manual_quantity_override === undefined
            ? "-"
            : `${displayMaterialQuantity(material.manual_quantity_override)} ${material.unit || ""}`,
          `${displayMaterialQuantity(finalQuantity)} ${material.unit || ""}`,
          `${displayMaterialQuantity(material.waste_factor)}%`,
        ];
      }),
    );
  } else {
    labelValue("Materials", "No materials entered.");
  }
  if (summary.materialTotals && Object.keys(summary.materialTotals).length) {
    labelValue(
      "Material totals by unit",
      Object.entries(summary.materialTotals)
        .map(
          ([unit, quantity]) => `${displayMaterialQuantity(quantity)} ${unit}`,
        )
        .join(", "),
    );
  }

  section("Scope");
  const scopeSections = (summary.scope ?? []).filter((item) =>
    String(item.content ?? "").trim(),
  );
  if (scopeSections.length) {
    scopeSections
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .forEach((item) => {
        labelValue(item.title || "Scope", item.content || "-");
      });
  } else {
    labelValue("Scope", "No scope sections entered.");
  }

  section("Crew Instructions");
  const checklist = Array.isArray(summary.crew?.checklist)
    ? summary.crew.checklist
    : [];
  if (checklist.length) {
    table(
      ["Done", "Instruction", "Details"],
      checklist.map((item) => [
        item.completed ? "Yes" : "No",
        item.title || "-",
        item.body || "-",
      ]),
    );
  } else {
    labelValue("Checklist", "No checklist items entered.");
  }
  if (summary.crew?.work_sequence) {
    labelValue("Work sequence", summary.crew.work_sequence);
  }
  if (summary.crew?.assigned_crew_text) {
    labelValue("Assigned crew", summary.crew.assigned_crew_text);
  }
  if (summary.crew?.user_safety_notes) {
    labelValue("Safety note", summary.crew.user_safety_notes);
  }

  section("Disclaimers");
  [
    "Estimates only.",
    "Verify all field measurements before ordering materials or starting work.",
    "This is not engineering, architectural, or building-code approval.",
    "This is not an automated professional takeoff. Quantities depend on user-entered measurements and assumptions.",
    "Material waste factors are assumptions and may vary by site conditions, product, crew, and installation method.",
    "User remains responsible for final quantities.",
  ].forEach((line) => {
    wrapped(line, margin, contentWidth);
    y += 2;
  });

  addPageNumbers(doc);
  return doc.output("arraybuffer");
}

export function constructionPdfFilename(
  projectName: string | null | undefined,
) {
  const base = (projectName || "construction-summary")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "construction-summary"}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
}

export async function blobToDataUrl(blob: Blob) {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return `data:${blob.type};base64,${buffer.toString("base64")}`;
}

function addPageNumbers(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#6B7280");
    doc.text(footerDisclaimer, margin, pageHeight - 30, {
      maxWidth: contentWidth - 70,
    });
    doc.text(`${page} / ${pages}`, pageWidth - margin - 28, pageHeight - 30);
  }
}

function formatContact(contact: PdfSummary["contact"]) {
  if (!contact) return "";
  const full = `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim();
  return contact.name || full || contact.email || contact.phone || "";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
