@rapture-sh/mailer
==================

A provider-agnostic, end-to-end type-safe mail library for TypeScript. You declare a
typed template registry once, then send by template name with typed fields, and the
compiler knows what every provider can and cannot do.

**Capabilities are types, not runtime flags.** If the configured provider cannot
schedule, passing `sendAt` is a compile error, not a 400 at runtime. That is the part
nobody else does, and it is the reason this package exists.

Written in TypeScript, ESM only, with no dependencies of its own. Providers are
pluggable and the SDK behind one is an optional peer dependency, so installing this does
not drag in a provider you never use.

> **Status.** The repository scaffolding and conventions are in place. The template
> registry, the typed send surface and the providers land in the commits that follow, and
> this README is the contract they are built against.

It started inside the [Kywi](https://github.com/rapture-sh) monorepo, where sending mail
was four hand-written wrapper functions over a `console.log` stub in
`convex/lib/emails.ts`, with no provider behind it and no types on the template fields.
It was extracted here, rebuilt around a typed template registry and pluggable providers,
and extended well past the original. Kywi now consumes it like everyone else.


Install
-------

```bash
pnpm add @rapture-sh/mailer
```

Node 22 or newer. The package is ESM only, which Node 22, Next and Convex all handle.

A provider's SDK is an optional peer dependency. Install it alongside only if you use
that provider:

```bash
pnpm add resend
```


The shape
---------

```ts
import { createMailer, defineTemplate } from "@rapture-sh/mailer";
import { resend } from "@rapture-sh/mailer/resend";

const mailer = createMailer({
  provider: resend({
    apiKey: env.RESEND_API_KEY,
    baseUrl: env.RESEND_BASE_URL,
  }),
  from: "Kywi <noreply@kywi.ch>",
  templates: {
    "account-deletion-code": defineTemplate<{ code: string }>({
      subject: (f) => `Your code is ${f.code}`,
      render: (f) => ({
        html: `<p>Your code is <b>${f.code}</b>.</p>`,
        text: `Your code is ${f.code}.`,
      }),
    }),
  },
});

const result = await mailer.send(
  "account-deletion-code",
  { email: "ada@example.com", name: "Ada" },
  { code: "519204" },
);

if (!result.ok && result.error.kind === "RateLimited") {
  // retryAfterMs exists on this kind only, so reading it needs the narrowing
}
```

Three arguments, in that order: which template, who it goes to, and the fields that
template asked for. There is no untyped options bag and no string subject line at the
call site.


Five levels of type safety
--------------------------

This is the whole product. Each level is a type test in `tests/types/`, and every one of
them asserts that the wrong code fails to compile.

**1. Template names are a literal union** inferred from the registry you passed. A typo
is a compile error rather than an email nobody receives.

```ts
await mailer.send("account-deletion-cdoe", to, { code });
//                ^ Argument of type '"account-deletion-cdoe"' is not assignable to
//                  parameter of type '"account-deletion-code"'
```

**2. Field objects are inferred per template.** A missing field, a misspelled one or an
extra one is a compile error, narrowed to the template you named in that same call.

```ts
await mailer.send("account-deletion-code", to, {});
//                                             ^ Property 'code' is missing
```

**3. Provider options are typed to the configured provider.** Resend's extras exist when
Resend is configured and become errors when it is not. The memory provider accepts none
of them.

**4. Capabilities are types, not runtime flags.** Each provider threads a capability type
out of itself and the send options are conditional on it, so a provider that cannot
schedule has no `sendAt` to pass.

```ts
await mailer.send("account-deletion-code", to, { code }, { sendAt: tomorrow });
//                                                        ^ this provider does not
//                                                          declare the schedule
//                                                          capability
```

This is the level worth caring about. Every other mail library finds this out at the API
boundary by reading an error response, which means the failure surfaces in production, on
the one code path nobody exercised.

**5. Results are a discriminated union, not throws.** `send` does not reject on a mail
failure, so retry and fallback logic is exhaustively checkable and a missed case is a
compile error.

```ts
type MailResult = { ok: true; id: string } | { ok: false; error: MailError };
```

`MailError` discriminates on `kind`, and a kind means the same thing whatever provider
produced it. Normalising these across providers is the real work in this package and
most of its value.

| Kind | What happened | Retried by core |
| --- | --- | --- |
| `RateLimited` | The provider asked you to slow down. Carries `retryAfterMs` where the provider says. | yes |
| `ProviderDown` | 5xx, a timeout, or a transport failure. | yes |
| `InvalidRecipient` | The address is not deliverable and will not become deliverable. | no |
| `Suppressed` | The recipient is on the provider's suppression list. | no |
| `AuthFailed` | The API key was rejected. | no |
| `PayloadTooLarge` | The message is over the provider's size limit. | no |
| `Unknown` | Nothing mapped. Carries the original payload so you can look. | no |

Weakening one of the five is allowed, but it costs a failing type test removed in the
same commit and a note here saying what changed. They are the contract.


Retries
-------

Backoff lives in core and retries only the transient kinds, so retry behaviour is one
implementation that every provider inherits and that the memory provider can drive
without a network.

**Providers never retry.** A provider maps a response to a `MailError` and returns. One
that swallows a 429 and sleeps is invisible to the caller, untestable from the suite, and
disagrees with every other provider about what a retry means.


Providers in v1
---------------

**`resend(...)`** wraps the official [`resend`](https://resend.com/docs) SDK and passes
`baseUrl` straight through, so the same provider code can point at anything speaking the
Resend API.

**`memory(...)`** collects messages in an array for tests. No network, synchronous
assertions, a `sent` accessor and a `clear()`:

```ts
import { memory } from "@rapture-sh/mailer/memory";

const provider = memory();
const mailer = createMailer({ provider, from: "Kywi <noreply@kywi.ch>", templates });

await mailer.send("account-deletion-code", to, { code: "519204" });

expect(provider.sent).toHaveLength(1);
expect(provider.sent[0].subject).toBe("Your code is 519204");
provider.clear();
```


Local development
-----------------

There is deliberately **no local or dev provider.** For local work, point the `resend`
provider at [mock-resend](https://github.com/rapture-sh/mock-resend) through `baseUrl`:

```ts
resend({
  apiKey: "re_local",
  baseUrl: env.RESEND_BASE_URL,
});
```

Development and CI then exercise the same provider code that runs in production, instead
of a second code path that merely resembles it. The inbox you look at lives in
mock-resend, not here.

One guard comes with that. The mailer asserts at construction that a non-default
`baseUrl` is permitted only outside production, and fails loudly otherwise. A deploy that
posts real mail into a mock inbox is silent, looks healthy, and is the failure mode this
prevents.


Not in scope
------------

Kept out on purpose, so this stays a typed send surface and nothing else:

- **No rendering engine.** A template returns strings, or takes a render function you
  supply. React Email is a caller-side or provider-side concern, never core.
- **No queueing and no retry scheduling** beyond the in-process backoff above. A durable
  queue belongs to your runtime, which already has one.
- **No marketing audiences, contacts or lists.**
- **No inbound parsing** of replies or webhooks.
- **No analytics**, opens, clicks or delivery dashboards. Your provider has those.

Two structural rules hold that line: core never imports a provider SDK, and a provider
never implements retry.


Contributing
------------

Read [CONTRIBUTING.md](CONTRIBUTING.md), and [AGENTS.md](AGENTS.md) for the conventions
that apply to every change, whoever or whatever makes it.

```bash
pnpm install
```

```bash
pnpm check
```


License
-------

MIT. See [LICENSE](LICENSE). Part of [Rapture.sh](https://rapture.sh).
