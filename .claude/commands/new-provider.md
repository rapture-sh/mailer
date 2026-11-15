---
description: Add a provider end to end, with its capability type, error mapping and type tests
argument-hint: [provider name]
---

Add the `$ARGUMENTS` provider to this package.

Read `.agents/provider-builder.md` and follow it in order. Read the provider's API
documentation for sending **and** for its error responses before writing anything; the
error mapping is the work, and guessing it makes the caller's retry logic useless.

Stop and ask before adding a capability that no existing provider declares, since that
changes the shared option types rather than just this file.

Finish with `pnpm check` green, and report which error kinds you mapped, what evidence
you had for each one, and anything the API can answer that you could not map.
