---
"@rapturedotsh/mailer": minor
---

First release. Provider-agnostic, end-to-end type-safe mail for TypeScript: a typed
template registry declared once or generated from letter files, senders and locales checked
by the compiler, and a provider whose capabilities reach the call site as types rather than
runtime flags, with the `resend` and `memory` providers, backoff over the transient error
kinds, and no runtime dependencies.
