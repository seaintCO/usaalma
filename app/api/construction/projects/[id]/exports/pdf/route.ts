import {
  readJson,
  requireConstructionUser,
  routeError,
} from "@/lib/construction/routes";
import {
  blobToDataUrl,
  constructionPdfFilename,
  createConstructionPdf,
  type ConstructionPdfImage,
} from "@/lib/construction/pdf";
import { ok } from "@/lib/construction/api";
import { ConstructionRepository } from "@/lib/db/repositories/construction/construction.repository";

type SummaryFile = {
  id: string;
  title?: string | null;
  mime_type?: string | null;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { id } = await context.params;
  const body = await readJson(request);
  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim().slice(0, 120)
      : crypto.randomUUID();

  try {
    const existing =
      await ConstructionRepository.getCompletedExportByIdempotencyKey(
        user.id,
        id,
        idempotencyKey,
      );
    if (existing) {
      return ok({ export: existing, reused: true });
    }

    const summary = await ConstructionRepository.getSummary(user.id, id);
    const filename = constructionPdfFilename(summary.project.project_name);
    const exportRecord = await ConstructionRepository.createExportRecord(
      user.id,
      id,
      {
        idempotencyKey,
        filename,
        sourceSnapshot: buildSourceSnapshot(summary),
      },
    );

    try {
      const images = await loadPdfImages(
        user.id,
        (summary.files ?? []) as SummaryFile[],
      );
      const pdf = createConstructionPdf({
        summary,
        images,
        generatedAt: new Date(),
      });
      const storagePath = await ConstructionRepository.uploadExportPdf(
        user.id,
        id,
        filename,
        pdf,
      );
      const completed = await ConstructionRepository.completeExportRecord(
        user.id,
        exportRecord.id,
        {
          storagePath,
          filename,
          sourceSnapshot: buildSourceSnapshot(summary),
        },
      );
      return ok({ export: completed, reused: false }, { status: 201 });
    } catch (generationError) {
      await ConstructionRepository.failExportRecord(
        user.id,
        exportRecord.id,
        "generation_failed",
        "Construction PDF could not be generated.",
      );
      throw generationError;
    }
  } catch (cause) {
    return routeError(cause, "Construction PDF could not be generated.");
  }
}

async function loadPdfImages(userId: string, files: SummaryFile[]) {
  const images: ConstructionPdfImage[] = [];
  const imageFiles = files
    .filter(
      (file) =>
        file.mime_type === "image/png" || file.mime_type === "image/jpeg",
    )
    .slice(0, 4);
  for (const file of imageFiles) {
    try {
      const downloaded = await ConstructionRepository.downloadPlanFileBlob(
        userId,
        file.id,
      );
      if (!downloaded) continue;
      images.push({
        fileId: file.id,
        title: file.title || "Plan photo",
        mimeType: downloaded.file.mime_type,
        dataUrl: await blobToDataUrl(downloaded.blob),
      });
    } catch {
      // PDF generation should not fail just because an image preview cannot embed.
    }
  }
  return images;
}

function buildSourceSnapshot(summary: {
  counts?: Record<string, number>;
  materialTotals?: Record<string, number>;
}) {
  return {
    counts: summary.counts ?? {},
    materialTotals: summary.materialTotals ?? {},
    capturedAt: new Date().toISOString(),
  };
}
