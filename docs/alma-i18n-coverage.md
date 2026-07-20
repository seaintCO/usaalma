# ALMA English/Spanish Coverage

Date: 2026-07-20

## Canonical locale contract

- Supported interface locales: `en`, `es`.
- English locale tag: `en-US`.
- Spanish locale tag: `es-419` for professional Latin American formatting.
- Canonical control: the shared ALMA shell selector.
- Persistence: authenticated profile API, `alma_locale` cookie, and compatibility key `alma_language` in local storage.
- Client synchronization: `alma-language-change` event.
- User-created content is never implicitly translated or overwritten.
- Translator source/target controls remain feature controls, not interface-locale controls.

## Current coverage

| Surface                                                | English | Spanish | Notes                                                                                           |
| ------------------------------------------------------ | ------- | ------- | ----------------------------------------------------------------------------------------------- |
| Shared shell navigation                                | Covered | Covered | Selector now persists centrally                                                                 |
| Notes                                                  | Covered | Covered | Duplicate locale control removed; natural Spanish strings and locale-aware dates                |
| Tasks and Planner                                      | Covered | Covered | Canonical live locale, localized CRUD/error/confirmation states and locale-aware dates          |
| Documents                                              | Covered | Covered | Canonical live locale, upload/search/download/delete states and localized confirmation          |
| Apps, Marketplace, Approvals, Connections and Settings | Covered | Covered | Canonical live locale replaces per-page language fetch/state                                    |
| Workspaces                                             | Covered | Covered | Shared shell, personal fallback, owned create/list/invite and truthful request states           |
| Office and Communications                              | Covered | Covered | Canonical live locale replaces isolated API-backed language state                               |
| Translator                                             | Covered | Covered | Interface locale is canonical; translation direction remains an independent feature control     |
| Fitness, Images, Creative, Launch Studio and Trader    | Covered | Covered | Existing paired dictionaries now consume canonical live locale                                  |
| Builder list and create                                | Covered | Covered | Canonical live locale; project language remains a separate project setting                      |
| Apps                                                   | Covered | Covered | Page dictionary exists; catalog module metadata still needs canonical localized registry fields |
| Builder project workbench                              | Covered | Partial | Technical workbench strings and event-stage translations remain to centralize                   |
| Remaining canonical modules                            | Partial | Partial | Existing page-local dictionaries require consolidation and parity validation                    |

## Known legacy systems to retire safely

- `lib/i18n/alma.ts`
- `lib/i18n/appLanguage.ts`
- `lib/i18n/translations.ts`
- `lib/i18n/almaI18n.ts`
- Page-local dictionaries outside the shared typed catalog

They remain compatibility surfaces for existing pages. New locale persistence must use `lib/i18n/locale.ts` and `lib/i18n/useAlmaLocale.ts`; consolidation must preserve current routes while moving owned UI strings into typed dictionaries.

## Verification rule

Milestone 7 checks must fail for dictionary key mismatch, malformed isolated locale controls, client imports of server secret accessors, missing registry routes, Notes selection-contract regression, missing approval boundaries, or unsafe Builder iframe configuration.
