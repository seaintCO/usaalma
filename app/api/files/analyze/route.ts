import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";

async function extractText(file:File, buffer:Buffer) {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type.startsWith("text/") || name.endsWith(".csv")) {
    return buffer.toString("utf8").slice(0, 30000);
  }

  if (name.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    return parsed.text.slice(0, 30000);
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value.slice(0, 30000);
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type:"buffer" });
    return workbook.SheetNames.map((sheet) => {
      const rows = XLSX.utils.sheet_to_csv(workbook.Sheets[sheet]);
      return `Sheet: ${sheet}\n${rows}`;
    }).join("\n\n").slice(0, 30000);
  }

  return "";
}

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error:"Missing OPENAI_API_KEY" }, { status:500 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const question = String(form.get("question") || "Analyze this file and explain the important details clearly.");

  if (!file) {
    return NextResponse.json({ error:"Missing file" }, { status:400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const client = new OpenAI({ apiKey:process.env.OPENAI_API_KEY });

  if (file.type.startsWith("image/")) {
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const result:any = await client.responses.create({
      model:process.env.ALMA_MODEL || "gpt-5.5",
      input:[{
        role:"user",
        content:[
          { type:"input_text", text:`${question}\n\nBe practical, detailed, and clear.` },
          { type:"input_image", image_url:dataUrl }
        ]
      }]
    });

    return NextResponse.json({ success:true, answer:result.output_text });
  }

  const text = await extractText(file, buffer);

  if (!text) {
    return NextResponse.json({
      success:false,
      error:"This file type is not supported yet. Use images, PDF, DOCX, TXT, CSV, or XLSX."
    }, { status:400 });
  }

  const result:any = await client.responses.create({
    model:process.env.ALMA_MODEL || "gpt-5.5",
    input:`${question}

File name: ${file.name}

File content:
${text}`
  });

  return NextResponse.json({ success:true, answer:result.output_text });
}
