export type PlanStep = {
  tool: string;
  label: string;
  args: any;
};

export type AlmaPlan = {
  goal: string;
  steps: PlanStep[];
};
