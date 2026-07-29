# AI usage and autonomy

ALMA Office performs no generative-AI calls. ALMA AI uses centralized
entitlements and metering before provider access.

Customer-facing units include AI replies, actions, documents, voice minutes,
and workflows. Internally, ALMA reserves usage atomically, settles actual use,
releases failed reservations, enforces concurrency/idempotency, and records
estimated provider cost.

Autonomy modes are Manual, Draft, Assisted, and Autonomous. Sending external
messages, financial changes, refunds, discounts, exports, payroll changes,
connector removal, and destructive actions require explicit policy and usually
approval. Model names and limits remain environment/configuration driven.
