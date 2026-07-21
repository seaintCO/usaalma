import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createRequire } from "module";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { buildImageAnalysisPrompt } from "@/lib/ai/files/imageAnalysisPrompt";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

const require = createRequire(import.meta.url);

async function extractText(file: File, buffer: Buffer) {
  const name = file.name.toLowerCase();

  if (file.type.startsWith("text/") || name.endsWith(".csv")) {
    return { text: buffer.toString("utf8").slice(0, 50000), pages: 1 };
  }

  if (name.endsWith(".pdf")) {
    const pdfParse = require("pdf-parse");
    const parsed = await pdfParse(buffer);
    return {
      text: parsed.text.slice(0, 50000),
      pages: Math.max(1, Number(parsed.numpages ?? 1)),
    };
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return {
      text: parsed.value.slice(0, 50000),
      pages: Math.max(1, Math.ceil(parsed.value.length / 3000)),
    };
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    return {
      text: workbook.SheetNames.map((sheet) => {
        const rows = XLSX.utils.sheet_to_csv(workbook.Sheets[sheet]);
        return `Sheet: ${sheet}\n${rows}`;
      })
        .join("\n\n")
        .slice(0, 50000),
      pages: Math.max(1, workbook.SheetNames.length),
    };
  }

  return { text: "", pages: 0 };
}

async function post(req: Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const question = String(form.get("question") || "Analyze this file clearly.");

  if (!file)
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 },
    );

  const buffer = Buffer.from(await file.arrayBuffer());
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const configured = modeConfiguration("thinking");

  if (file.type.startsWith("image/")) {
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result: any = await withUsageReservation(
      {
        userId: user.id,
        feature: "document_analysis",
        mode: null,
        model: configured.model,
        units: { documentPages: 1 },
        idempotencyKey: `file-image:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
      },
      () =>
        client.responses.create({
          model: configured.model,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: buildImageAnalysisPrompt(file.name, question),
                },
                { type: "input_image", image_url: dataUrl, detail: "high" },
              ],
            },
          ],
        }),
    );

    return NextResponse.json({ success: true, answer: result.output_text });
  }

  const extracted = await extractText(file, buffer);

  if (!extracted.text) {
    return NextResponse.json(
      { error: "Unsupported file type." },
      { status: 400 },
    );
  }

  const result: any = await withUsageReservation(
    {
      userId: user.id,
      feature: "document_analysis",
      mode: null,
      model: configured.model,
      units: { documentPages: extracted.pages },
      idempotencyKey: `file-analysis:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    },
    () =>
      client.responses.create({
        model: configured.model,
        input: `
Analyze this uploaded file like ChatGPT.

User request:
${question}

File name:
${file.name}

File content:
${extracted.text}
`,
      }),
  );

  return NextResponse.json({ success: true, answer: result.output_text });
}
export const POST = withUsageRoute(post);
