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
  transactions: BusinessTransaction[];
  appointments: BusinessAppointment[];
};
