# ALMA entitlement matrix

Public names map into the canonical module registry; they do not create a second plan engine.

| Capability                                   | Essential (`starter`)                     | Autonomous (`business`)                                          |
| -------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| Tasks, Planner, Notes, Documents             | Included                                  | Included                                                         |
| Basic CRM and invoicing                      | Included                                  | Included                                                         |
| Translator and Connections management        | Included                                  | Included                                                         |
| Bilingual external communication preparation | Upgrade required                          | Included where configured                                        |
| ALMA Office and Approval Center              | Upgrade required                          | Included                                                         |
| Creator, Studio, voice, Builder              | Upgrade required                          | Included where configured                                        |
| Provider-backed actions                      | Not included unless explicitly configured | Plan access plus provider readiness and approval policy required |

Only `active` and `trialing` subscriptions grant paid module access. Other subscription states do not grant access. Cancellation at period end retains access while Stripe still reports an active status; the deleted/canceled webhook removes access at the effective transition. Data is retained when access ends.

The anonymous homepage has no subscription and grants no real module or action access.
