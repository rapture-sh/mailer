# testing

What testing mail looks like when you can actually mock it. This is the example to copy
first, because it is the problem the package exists for.

```bash
pnpm example:testing
```

```
mailer.ts            the registry an application would export, taking its provider in
mailer.test.ts       vitest tests against the memory provider
vitest.config.mts    a config of its own, because mail tests live beside the application
```

What it shows:

- **No network, no API key, no container, and no `if (NODE_ENV === "test") return`** in the
  code under test. The application exports `mailerFor(provider)`, a test hands it
  `memory()` and production hands it `resend(...)`. The code that runs in a test is the
  code that runs in production, with the backend swapped.
- **Assert on what was sent.** The memory provider records the sender, the recipient, the
  subject, both bodies, attachments and headers, so a test says what a user would receive
  rather than that a mock was called.
- **Drive the failure paths on purpose.** `failNext()` queues errors, so the test for "what
  does our code do when the address is dead" does not need a dead address.
- **Drive backoff without waiting.** The retry options take a `sleep`, so a test replaces
  it and a three attempt sequence takes no time at all.
- **Idempotency is real.** A repeated key sends one message, which is what makes a retried
  job safe, and the test proves it rather than assuming it.

One level up from here is [mock-resend](https://github.com/rapturedotsh/mock-resend) for local
and integration work: real HTTP, the real provider, and a dashboard to open the mail in.
See [with-locales](../with-locales/README.md) for how the base url is swapped in
development and ignored in production.
