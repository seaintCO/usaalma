# Testing

Required release checks:

```bash
npm run check:encoding
npm run business-office:check
npm run milestone6:check
npm run milestone7:check
npm run usage:check
npx tsc --noEmit
npm run lint
npm run build
```

Authenticated staging checks must cover registration, onboarding, Office with
zero AI calls, customer/task/appointment creation, estimate-to-invoice,
transaction/receipt/report updates, QuickBooks OAuth start/disconnect,
AI entitlement rejection, AI approval, Stripe upgrade/downgrade, bilingual
routes, and two-workspace isolation.
