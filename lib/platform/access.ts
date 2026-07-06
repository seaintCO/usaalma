import { ALMA_APPS, type AlmaAppKey } from "./apps";

export type UserAccess = Partial<Record<AlmaAppKey, boolean>>;

export function hasAppAccess(appKey: AlmaAppKey, access?: UserAccess) {
  const app = ALMA_APPS.find((item) => item.key === appKey);
  if (!app) return false;
  if (app.free) return true;
  return Boolean(access?.[appKey]);
}

export function getLockedApps(access?: UserAccess) {
  return ALMA_APPS.filter((app) => !hasAppAccess(app.key, access));
}

export function getUnlockedApps(access?: UserAccess) {
  return ALMA_APPS.filter((app) => hasAppAccess(app.key, access));
}
