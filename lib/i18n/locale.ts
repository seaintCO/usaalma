export const ALMA_LOCALES = ["en", "es"] as const;
export type AlmaLocale = (typeof ALMA_LOCALES)[number];

export const DEFAULT_ALMA_LOCALE: AlmaLocale = "en";
export const ALMA_LOCALE_COOKIE = "alma_locale";

export function isAlmaLocale(value: unknown): value is AlmaLocale {
  return value === "en" || value === "es";
}

export function localeTag(locale: AlmaLocale) {
  return locale === "es" ? "es-419" : "en-US";
}

export function formatAlmaDate(
  value: string | number | Date,
  locale: AlmaLocale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) {
  return new Intl.DateTimeFormat(localeTag(locale), options).format(
    new Date(value),
  );
}
