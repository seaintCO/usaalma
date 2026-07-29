import { getCurrentUser } from "@/lib/auth/user";
import { createInvoicePdf } from "@/lib/invoices/pdf";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const supabase = await createClient();
  const { id } = await context.params;
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*,invoice_line_items(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!invoice) return new Response("Not found", { status: 404 });
  const file = createInvoicePdf(invoice);
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${file.fileName}"`,
    },
  });
}
