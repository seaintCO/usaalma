import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

function numeric(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) && result >= 0 ? result : 0;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const supabase = await createClient();
  const [people, periods, entries] = await Promise.all([
    supabase
      .from("business_payroll_people")
      .select(
        "id,display_name,worker_type,pay_type,rate,active,w9_status,notes",
      )
      .eq("user_id", user.id)
      .order("display_name"),
    supabase
      .from("business_payroll_periods")
      .select(
        "id,period_start,period_end,pay_date,status,gross_pay,reimbursements,bonuses,deduction_notes",
      )
      .eq("user_id", user.id)
      .order("period_end", { ascending: false })
      .limit(24),
    supabase
      .from("business_payroll_entries")
      .select(
        "id,period_id,person_id,regular_hours,overtime_hours,reimbursements,bonuses,calculated_gross_pay,notes",
      )
      .eq("user_id", user.id)
      .limit(500),
  ]);
  if (people.error || periods.error || entries.error) {
    return NextResponse.json(
      { ok: false, error: { code: "payroll_unavailable" } },
      { status: 503 },
    );
  }
  return NextResponse.json({
    ok: true,
    people: people.data ?? [],
    periods: periods.data ?? [],
    entries: entries.data ?? [],
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const action = String(body?.action ?? "");
  const supabase = await createClient();

  if (action === "create_person") {
    const displayName = String(body?.displayName ?? "").trim();
    const workerType = String(body?.workerType ?? "");
    const payType = String(body?.payType ?? "");
    if (
      !displayName ||
      !["employee", "contractor"].includes(workerType) ||
      !["hourly", "salary", "project"].includes(payType)
    ) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_payroll_person" } },
        { status: 400 },
      );
    }
    const { data, error } = await supabase
      .from("business_payroll_people")
      .insert({
        user_id: user.id,
        display_name: displayName,
        worker_type: workerType,
        pay_type: payType,
        rate: numeric(body?.rate),
        w9_status:
          workerType === "contractor"
            ? String(body?.w9Status ?? "missing")
            : "not_applicable",
        notes: String(body?.notes ?? "").trim() || null,
      })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json(
        { ok: false, error: { code: "payroll_person_create_failed" } },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, person: data }, { status: 201 });
  }

  if (action === "create_period") {
    const start = String(body?.periodStart ?? "").slice(0, 10);
    const end = String(body?.periodEnd ?? "").slice(0, 10);
    if (!start || !end || end < start) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_payroll_period" } },
        { status: 400 },
      );
    }
    const { data, error } = await supabase
      .from("business_payroll_periods")
      .insert({
        user_id: user.id,
        period_start: start,
        period_end: end,
        pay_date: String(body?.payDate ?? "").slice(0, 10) || null,
      })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json(
        { ok: false, error: { code: "payroll_period_create_failed" } },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, period: data }, { status: 201 });
  }

  if (action === "add_entry") {
    const periodId = String(body?.periodId ?? "");
    const personId = String(body?.personId ?? "");
    const { data: person } = await supabase
      .from("business_payroll_people")
      .select("id,pay_type,rate")
      .eq("id", personId)
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: period } = await supabase
      .from("business_payroll_periods")
      .select("id")
      .eq("id", periodId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!person || !period) {
      return NextResponse.json(
        { ok: false, error: { code: "payroll_parent_not_found" } },
        { status: 404 },
      );
    }
    const hours = numeric(body?.regularHours);
    const overtime = numeric(body?.overtimeHours);
    const bonuses = numeric(body?.bonuses);
    const reimbursements = numeric(body?.reimbursements);
    const rate = numeric(person.rate);
    const base =
      person.pay_type === "hourly"
        ? hours * rate + overtime * rate * 1.5
        : rate;
    const gross = base + bonuses;
    const { data, error } = await supabase
      .from("business_payroll_entries")
      .upsert(
        {
          user_id: user.id,
          period_id: periodId,
          person_id: personId,
          regular_hours: hours,
          overtime_hours: overtime,
          bonuses,
          reimbursements,
          calculated_gross_pay: gross,
          notes: String(body?.notes ?? "").trim() || null,
        },
        { onConflict: "period_id,person_id" },
      )
      .select("*")
      .single();
    if (error) {
      return NextResponse.json(
        { ok: false, error: { code: "payroll_entry_save_failed" } },
        { status: 503 },
      );
    }
    const { data: allEntries } = await supabase
      .from("business_payroll_entries")
      .select("calculated_gross_pay,reimbursements,bonuses")
      .eq("period_id", periodId)
      .eq("user_id", user.id);
    await supabase
      .from("business_payroll_periods")
      .update({
        gross_pay: (allEntries ?? []).reduce(
          (sum, row) => sum + numeric(row.calculated_gross_pay),
          0,
        ),
        reimbursements: (allEntries ?? []).reduce(
          (sum, row) => sum + numeric(row.reimbursements),
          0,
        ),
        bonuses: (allEntries ?? []).reduce(
          (sum, row) => sum + numeric(row.bonuses),
          0,
        ),
      })
      .eq("id", periodId)
      .eq("user_id", user.id);
    return NextResponse.json({ ok: true, entry: data });
  }

  if (action === "update_period") {
    const status = String(body?.status ?? "");
    if (!["draft", "review", "approved", "exported"].includes(status)) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_payroll_status" } },
        { status: 400 },
      );
    }
    const { data, error } = await supabase
      .from("business_payroll_periods")
      .update({
        status,
        approved_at: status === "approved" ? new Date().toISOString() : null,
        deduction_notes: String(body?.deductionNotes ?? "").trim() || null,
      })
      .eq("id", String(body?.periodId ?? ""))
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: { code: "payroll_period_update_failed" } },
        { status: error ? 503 : 404 },
      );
    }
    return NextResponse.json({ ok: true, period: data });
  }

  return NextResponse.json(
    { ok: false, error: { code: "invalid_payroll_action" } },
    { status: 400 },
  );
}
