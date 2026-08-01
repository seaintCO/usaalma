# ALMA Office for iPhone

This Expo application is the App Store client for the real ALMA production workspace at `https://www.seaintalma.com`.

## Identity

- App name: **ALMA Office**
- Bundle ID: `com.seaint.alma`
- Apple Team ID: `5V5G75AUT9`
- App Store Connect app ID: `6796910855`
- Production host: `https://www.seaintalma.com`

The app appends `ALMA-iOS/1.0` to its user agent. The web application uses that marker to suppress Stripe subscription checkout, billing-portal links, upgrade links, and the $299 managed voice-agent checkout in the iPhone environment. Customer invoice payment links remain part of the business workflow, not ALMA digital-subscription purchasing.

## Local setup

```powershell
cd C:\Users\seain\Desktop\alma\mobile
npm install
npx eas-cli@latest login
npx eas-cli@latest init
```

When EAS prints the project UUID, store it locally or in EAS as `EXPO_PUBLIC_EAS_PROJECT_ID`. Never paste Apple passwords, `.p8`, `.p12`, provisioning profiles, Supabase keys, or Expo tokens into source control.

## Checks

```powershell
npm run typecheck
npm run doctor
cd ..
npm run mobile:check
```

## Build and TestFlight

```powershell
cd C:\Users\seain\Desktop\alma\mobile
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production --latest
```

EAS may ask you to sign in to Apple or approve a credential. Enter credentials only into the official EAS/Apple prompt. The submit profile is already linked to App Store Connect app `6796910855`.

Submitting the binary uploads it to App Store Connect and TestFlight; it does not submit the app for public App Review. Capture real screenshots from the TestFlight build, complete metadata/privacy/reviewer credentials in App Store Connect, select the build, and then click **Add for Review**.

## Native behavior

- Strict HTTPS navigation policy.
- Internal ALMA routes stay in the app.
- Known OAuth hosts can complete official provider authorization.
- Other safe external links open in Safari.
- Stripe subscription-checkout and billing hosts are blocked in the native shell.
- Camera and microphone are requested only when selected from **Add to ALMA**.
- The iOS document picker is opened only when requested.
- Push permission is requested only from the tools sheet.
- Push tokens are registered to the authenticated ALMA user after migration `20260731001000_alma_mobile_push_devices.sql` is applied.
