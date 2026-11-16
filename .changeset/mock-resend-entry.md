---
"@rapture-sh/mailer": minor
---

Add the `@rapture-sh/mailer/mock-resend` subpath. `mockResend()` returns the `resend`
provider with its base url preset to where mock-resend listens, so a caller picks the
provider with a ternary and both branches are one implementation, and it refuses to be
constructed when `NODE_ENV` is `production`.
