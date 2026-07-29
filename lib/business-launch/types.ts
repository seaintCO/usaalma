export type BusinessEntityType =
  | "undecided"
  | "sole_proprietorship"
  | "llc"
  | "corporation"
  | "partnership"
  | "nonprofit";

export type BusinessLaunchProjectStatus =
  | "planning"
  | "filing"
  | "operating"
  | "paused";

export type BusinessLaunchTaskStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "not_applicable";

export type BusinessLaunchStage =
  | "foundation"
  | "registration"
  | "tax"
  | "operations"
  | "compliance";

export type BusinessLaunchProject = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  country: "US";
  formation_state: string;
  entity_type: BusinessEntityType;
  desired_name: string;
  legal_name: string | null;
  dba_name: string | null;
  business_purpose: string | null;
  industry: string | null;
  city: string | null;
  owner_count: number;
  registered_agent_status:
    | "undecided"
    | "self"
    | "third_party"
    | "confirmed";
  state_filing_status:
    | "not_started"
    | "in_progress"
    | "submitted"
    | "approved"
    | "rejected";
  state_filing_number: string | null;
  formation_date: string | null;
  ein_status: "not_started" | "in_progress" | "received" | "not_required";
  ein_last_four: string | null;
  bank_status: "not_started" | "in_progress" | "opened";
  accounting_status: "not_started" | "in_progress" | "ready";
  licenses_status:
    | "not_reviewed"
    | "in_progress"
    | "complete"
    | "not_required";
  insurance_status:
    | "not_reviewed"
    | "in_progress"
    | "covered"
    | "not_required";
  launch_status: BusinessLaunchProjectStatus;
  last_reviewed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessLaunchTask = {
  id: string;
  project_id: string;
  user_id: string;
  workspace_id: string | null;
  code: BusinessLaunchTaskCode;
  stage: BusinessLaunchStage;
  status: BusinessLaunchTaskStatus;
  title: string | null;
  notes: string | null;
  due_date: string | null;
  official_url: string | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessComplianceDeadline = {
  id: string;
  project_id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  due_date: string;
  cadence: "one_time" | "monthly" | "quarterly" | "annual" | "custom";
  status: "upcoming" | "completed" | "dismissed";
  official_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessLaunchTaskCode =
  | "structure_review"
  | "name_check"
  | "registered_agent"
  | "state_filing"
  | "formation_documents"
  | "ein"
  | "state_tax"
  | "licenses"
  | "bank"
  | "insurance"
  | "accounting"
  | "operating_documents"
  | "compliance_calendar"
  | "boi_check";

export type BusinessLaunchPayload = {
  project: BusinessLaunchProject;
  tasks: BusinessLaunchTask[];
  deadlines: BusinessComplianceDeadline[];
};
