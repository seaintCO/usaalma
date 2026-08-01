"use client";

import { useSyncExternalStore } from "react";

const IOS_APP_MARKER = "ALMA-iOS";

export function isAlmaIosApp() {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.includes(IOS_APP_MARKER);
}

export function useIsAlmaIosApp() {
  return useSyncExternalStore(
    () => () => undefined,
    isAlmaIosApp,
    () => false,
  );
}
