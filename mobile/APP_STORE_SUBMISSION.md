# ALMA Office — App Store submission

## What is ready in source

- Expo SDK 57 iPhone app.
- Bundle ID `com.seaint.alma`.
- Secure connection to `https://www.seaintalma.com`.
- Associated-domain contract and AASA endpoint.
- Camera, microphone, photo/document selection, Face ID description, and remote-notification declarations.
- Native tools sheet for receipt capture, documents, voice, and notifications.
- iOS suppression for ALMA digital subscription and managed-service Stripe purchase CTAs.
- EAS production build and App Store Connect submit profiles.
- English and Spanish store copy.
- Reviewer test checklist.

## Required owner actions

1. Apply `supabase/migrations/20260731001000_alma_mobile_push_devices.sql`.
2. Deploy the web revision so native purchase suppression, device registration, and AASA are live.
3. Run `eas init` once and set `EXPO_PUBLIC_EAS_PROJECT_ID` in EAS.
4. Build the signed production `.ipa` through EAS.
5. Install the TestFlight build on a physical iPhone.
6. Test login, onboarding, Customers, Money, Inbox, ALMA, camera, documents, microphone, and notifications with a dedicated reviewer workspace.
7. Capture real screenshots from that TestFlight build. Do not upload mockups as product screenshots.
8. Add a non-owner demo/reviewer account in App Review Information. Do not place credentials in this repository.
9. Complete App Privacy accurately from actual production data handling.
10. Select the processed build and submit for review in App Store Connect.

## Real screenshot checklist

Capture at least these screens on a current 6.9-inch iPhone simulator/device at an accepted resolution:

1. Bilingual onboarding.
2. Morning business briefing.
3. Customers / CRM.
4. Money dashboard using truthful reviewer-workspace records.
5. Unified Inbox.
6. ALMA assistant with a completed, non-sensitive business answer.

Apple accepts 1–10 screenshots. Current accepted 6.9-inch portrait sizes include 1320×2868, 1290×2796, and 1260×2736. Never include real customer names, phone numbers, invoices, tokens, or private financial information.

## App Review notes

ALMA Office is a free-to-download companion client for the ALMA web business office. This iOS binary does not show links or calls to action to purchase ALMA digital subscriptions outside the app. Existing users can sign in and use the business-office features enabled for their ALMA workspace. The app does not move money, file taxes, or provide legal or licensed accounting advice. External financial or communication actions remain permission- and approval-controlled.

If ALMA later sells Office or AI subscriptions inside iOS, implement StoreKit auto-renewable subscriptions (or a compliant entitlement service) before enabling those purchase controls in this binary.
