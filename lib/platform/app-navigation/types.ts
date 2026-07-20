export type AppNavigationPreference = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  module_id: string;
  pinned: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type PinnedApp = {
  moduleId: string;
  name: string;
  route: string;
  displayOrder: number;
};
