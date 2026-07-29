export type BusinessTransactionDirection = "income" | "expense";
export type BusinessTransactionType =
  | "operating"
  | "transfer"
  | "refund"
  | "owner_contribution"
  | "owner_draw"
  | "loan"
  | "payroll"
  | "tax";

export type BusinessTransaction = {
  id: string;
  transaction_date: string;
  description: string;
  merchant: string | null;
  amount: number;
  direction: BusinessTransactionDirection;
  transaction_type: BusinessTransactionType;
  category: string | null;
  review_status: "needs_review" | "reviewed" | "excluded";
  notes: string | null;
};

export type BusinessReceipt = {
  id: string;
  transaction_id: string | null;
  merchant: string | null;
  receipt_date: string | null;
  amount: number | null;
  tax_amount: number | null;
  category: string | null;
  payment_method: string | null;
  original_filename: string | null;
  content_type: string | null;
  review_status: "needs_review" | "matched" | "reviewed";
  notes: string | null;
  created_at: string;
};

export type PayrollPerson = {
  id: string;
  display_name: string;
  worker_type: "employee" | "contractor";
  pay_type: "hourly" | "salary" | "project";
  rate: number;
  active: boolean;
  w9_status: "not_applicable" | "missing" | "received";
  notes: string | null;
};

export type PayrollPeriod = {
  id: string;
  period_start: string;
  period_end: string;
  pay_date: string | null;
  status: "draft" | "review" | "approved" | "exported";
  gross_pay: number;
  reimbursements: number;
  bonuses: number;
  deduction_notes: string | null;
};

export type PayrollEntry = {
  id: string;
  period_id: string;
  person_id: string;
  regular_hours: number;
  overtime_hours: number;
  reimbursements: number;
  bonuses: number;
  calculated_gross_pay: number;
  notes: string | null;
};

export type TaxChecklistItem = {
  key: string;
  label: string;
  completed: boolean;
};

export type TaxChecklist = {
  id: string | null;
  tax_year: number;
  quarter: number;
  checklist: TaxChecklistItem[];
  notes: string | null;
  completed_items: number;
  total_items: number;
};

export type BusinessReportSnapshot = {
  period: { from: string; through: string };
  profitLoss: {
    operatingIncome: number;
    operatingExpenses: number;
    estimatedOperatingProfit: number;
    incomeByCategory: Array<{ category: string; amount: number }>;
    expensesByCategory: Array<{ category: string; amount: number }>;
  };
  cashFlow: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  invoiceAging: {
    current: number;
    days1To30: number;
    days31To60: number;
    days61Plus: number;
  };
  readiness: {
    transactionsToReview: number;
    missingReceipts: number;
    taxScore: number;
    contractorsMissingW9: number;
  };
};

export type BusinessAppointment = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  location: string | null;
  notes: string | null;
};

export type BusinessOfficeOverview = {
  period: { from: string; through: string };
  money: {
    collected: number;
    postedIncome: number;
    expenses: number;
    estimatedOperatingProfit: number;
    invoiced: number;
    outstandingInvoices: number;
  };
  attention: {
    newLeads: number;
    openTasks: number;
    appointmentsToday: number;
    overdueInvoices: number;
    transactionsToReview: number;
    missingReceipts: number;
  };
  taxReadiness: {
    completed: number;
    total: number;
    score: number;
  };
  quickBooks: {
    status: "connected" | "reauthorization_required" | "error" | "disconnected";
    companyName: string | null;
    lastSuccessfulSyncAt: string | null;
  };
  insights: {
    cashFlow: Array<{
      month: string;
      income: number;
      expenses: number;
      net: number;
    }>;
    expensesByCategory: Array<{
      category: string;
      amount: number;
    }>;
    invoicePipeline: Array<{
      status: string;
      count: number;
      amount: number;
    }>;
  };
  transactions: BusinessTransaction[];
  appointments: BusinessAppointment[];
};
