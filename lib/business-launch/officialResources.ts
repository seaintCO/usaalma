import type {
  BusinessEntityType,
  BusinessLaunchStage,
  BusinessLaunchTaskCode,
} from "./types";

export const US_STATES = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
] as const;

export const BUSINESS_ENTITY_TYPES: readonly BusinessEntityType[] = [
  "undecided",
  "sole_proprietorship",
  "llc",
  "corporation",
  "partnership",
  "nonprofit",
];

export const BUSINESS_LAUNCH_OFFICIAL_RESOURCES = {
  sbaLaunch:
    "https://www.sba.gov/business-guide/launch-your-business",
  structure:
    "https://www.sba.gov/business-guide/launch-your-business/choose-business-structure",
  name:
    "https://www.sba.gov/business-guide/launch-your-business/choose-your-business-name",
  register:
    "https://www.sba.gov/business-guide/launch-your-business/register-your-business",
  ein: "https://www.irs.gov/businesses/employer-identification-number",
  licenses:
    "https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits",
  bank:
    "https://www.sba.gov/business-guide/launch-your-business/open-business-bank-account",
  insurance:
    "https://www.sba.gov/business-guide/launch-your-business/get-business-insurance",
  compliance:
    "https://www.sba.gov/business-guide/manage-your-business/stay-legally-compliant",
  boi: "https://www.fincen.gov/boi",
} as const;

export const BUSINESS_LAUNCH_TASK_DEFINITIONS: readonly {
  code: BusinessLaunchTaskCode;
  stage: BusinessLaunchStage;
  sortOrder: number;
  officialUrl: string | null;
}[] = [
  {
    code: "structure_review",
    stage: "foundation",
    sortOrder: 10,
    officialUrl: BUSINESS_LAUNCH_OFFICIAL_RESOURCES.structure,
  },
  {
    code: "name_check",
    stage: "foundation",
    sortOrder: 20,
    officialUrl: BUSINESS_LAUNCH_OFFICIAL_RESOURCES.name,
  },
  {
    code: "registered_agent",
    stage: "foundation",
    sortOrder: 30,
    officialUrl: BUSINESS_LAUNCH_OFFICIAL_RESOURCES.register,
  },
  {
    code: "state_filing",
    stage: "registration",
    sortOrder: 40,
    officialUrl: BUSINESS_LAUNCH_OFFICIAL_RESOURCES.register,
  },
  {
    code: "formation_documents",
    stage: "registration",
    sortOrder: 50,
    officialUrl: null,
  },
  {
    code: "ein",
    stage: "tax",
    sortOrder: 60,
    officialUrl: BUSINESS_LAUNCH_OFFICIAL_RESOURCES.ein,
  },
  {
    code: "state_tax",
    stage: "tax",
    sortOrder: 70,
    officialUrl: BUSINESS_LAUNCH_OFFICIAL_RESOURCES.sbaLaunch,
  },
  {
    code: "licenses",
    stage: "operations",
    sortOrder: 80,
    officialUrl: BUSINESS_LAUNCH_OFFICIAL_RESOURCES.licenses,
  },
  {
    code: "bank",
    stage: "operations",
    sortOrder: 90,
    officialUrl: BUSINESS_LAUNCH_OFFICIAL_RESOURCES.bank,
  },
  {
    code: "insurance",
    stage: "operations",
    sortOrder: 100,
    officialUrl: BUSINESS_LAUNCH_OFFICIAL_RESOURCES.insurance,
  },
  {
    code: "accounting",
    stage: "operations",
    sortOrder: 110,
    officialUrl: null,
  },
  {
    code: "operating_documents",
    stage: "compliance",
    sortOrder: 120,
    officialUrl: BUSINESS_LAUNCH_OFFICIAL_RESOURCES.compliance,
  },
  {
    code: "compliance_calendar",
    stage: "compliance",
    sortOrder: 130,
    officialUrl: BUSINESS_LAUNCH_OFFICIAL_RESOURCES.compliance,
  },
  {
    code: "boi_check",
    stage: "compliance",
    sortOrder: 140,
    officialUrl: BUSINESS_LAUNCH_OFFICIAL_RESOURCES.boi,
  },
] as const;

export function isUsState(value: string): boolean {
  return US_STATES.some(([code]) => code === value);
}

export function isBusinessEntityType(
  value: string,
): value is BusinessEntityType {
  return BUSINESS_ENTITY_TYPES.includes(value as BusinessEntityType);
}
