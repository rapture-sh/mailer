@rapture-sh/mailer
==================

A provider-agnostic, end-to-end type-safe mail library for TypeScript. You declare a
typed template registry once, then send by template name with typed fields, and the
compiler knows what every provider can and cannot do.

**Capabilities are types, not runtime flags.** If the configured provider cannot
schedule, passing `sendAt` is a compile error, not a 400 at runtime. That is the part
nobody else does, and it is the reason this package exists.

Written in TypeScript, ESM only, with no dependencies at all. Providers are pluggable, and
both of the ones here need nothing installed alongside: the Resend provider posts to that
API directly rather than wrapping its SDK.

> **Status.** The send surface is built: `createMailer`, `send`, `sendTemplate`, typed
> senders, capabilities, backoff, and both providers, with the guarantees below covered by
> type tests. Templates are declared by hand for now; the build step that reads them out of
> `.hbs` files, and the copy catalog that localises them, are next.

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

Node 22 or newer. The package is ESM only, which Node 22, Next and Convex all handle, and
it has no dependencies at all. Nothing else to install for either provider.


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
  from: "Acme <noreply@example.com>",
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


Letters as files
----------------

Declaring twenty six letters by hand is the actual job, so a letter can instead be one
handlebars file with a header, and the build reads the fields off the body.

```hbs
---
from: auth
subject: Your code is {code}
sample:
  code: "519204"
---
{{#> layout heading="Sign in" }}
  <p>Hi {{ reader.name }},</p>
  <p>Your code is <b>{{ code }}</b>.</p>
{{/layout}}
```

No `fields:` block there, because a placeholder is a `string` until the header says
otherwise. What the body implies, and what always beats it:

| In the body | Becomes |
| --- | --- |
| `{{ code }}` | `code: string` |
| `{{#if voucherCode}}` | `voucherCode?: string`, along with everything inside the block |
| `{{#each tickets}}{{ name }}` | `tickets: readonly { name: string }[]` |
| `{{ reader.name }}` | nothing, the context supplies it |
| `fields:` in the header | exactly what you wrote, for the types a body cannot imply |

A file with a header is a letter. A file without one is a partial, which is how a layout is
recognised without being named anywhere. `inbox:` makes a letter internal, so no caller has
to address it, and `reply-to:` names the field to read a reply address out of.

The build is a function rather than a CLI, so it goes in a script in your own repo:

```ts
import { build } from "@rapture-sh/mailer/build";

await build({
  letters: "emails",
  out: "mail/templates.ts",
  senders: ["auth", "notifications"],
  check: process.argv.includes("--check"),
});
```

It writes two files. `mail/templates.ts` is the typed registry, ordinary TypeScript that
your own compiler checks, and `mail/templates.bodies.ts` is what handlebars' precompiler
emits, which is unannotated JavaScript carrying a `@ts-nocheck` and nothing else. They are
separate so that one suppression cannot cover the types, which are the point of generating
anything. Hand the registry to the mailer and the letters are typed at every call site:

```ts
import { templates } from "./mail/templates";

const mailer = createMailer({ provider, senders, from: "notifications", templates });

await mailer.sendTemplate("magic-code", { to, fields: { code: "519204" } });
```

The sample in the header is checked against the fields by the compiler, so a preview cannot
drift from the letter it previews. `check: true` writes nothing and reports whether the
committed output is current, which is what belongs in CI.

`handlebars` and `yaml` are optional peer dependencies of
`@rapture-sh/mailer/build`. Nothing that only sends mail installs either.

The body language is deliberately small for now: placeholders, `#if`, `#unless`, `#each`
and partials. An unknown helper fails the build by name rather than being quietly treated
as a field, so the localisation helpers (`t`, and formatting for dates, money and lists)
announce themselves as missing until they land.


Localisation
------------

The copy is your own JSON, wherever it lives and whatever you call your locales. Hand the
build the files and it reads them:

```ts
await build({
  letters: "emails",
  out: "mailer/templates.ts",
  senders: ["auth", "notifications"],
  copy: {
    default: "en-GB",
    catalogs: {
      "en-GB": "./locales/email/en-GB.json",
      "de-Test-CH": "./i18n/weird/place/german.json",
      pirate: "./copy/pirate.json",
    },
    // Values every key may use without being passed them, for the links in every
    // closing. Yours, so they go in as written; a caller's values are escaped.
    values: { supportLink: '<a href="mailto:support@example.com">support</a>' },
  },
});
```

**The locale names are the keys of that map and nothing parses them.** `de`, `de-CH`,
`de-Test-CH`, `pirate` and `internal-debug-9` are all equally fine. A name reaches `Intl`
when something is formatted, and one it cannot read falls back to the default locale rather
than failing to send. A directory works too, where each file's name is its locale:

```ts
copy: { default: "en-GB", catalogs: "./locales/email" }
```

In a letter, four helpers come with the catalogs:

```hbs
---
from: auth
subject:
  key: magic-code.subject
sample:
  code: "519204"
---
{{#> layout heading=(t "magic-code.heading") }}
  <p>{{ t "greeting.named" displayName=reader.name }}</p>
  <p>{{ t "magic-code.body" }}</p>
  <p>{{ date startsAt zone=timezone style="long" }}</p>
  <p>{{ t "booking.paid" totalAmount=(money totalMinor currency) }}</p>
  <p>{{ list tickets }}</p>
{{/layout}}
```

`t` takes a key and the values that key asks for. `date`, `time`, `dateTime`, `money` and
`list` are `Intl`, in the reader's locale, and they type their arguments: `startsAt`
becomes `number | Date`, `totalMinor` a `number`, `tickets` a `readonly string[]`. The zone
is passed rather than assumed, because a guest abroad still turns up at ten.

A subject can be a copy key instead of a line of text, written as `subject: { key: ... }`,
and its placeholders are taken from fields of the same name. That is also the end of
reading a subject back out of the rendered `<title>` with a regex.

The build is what makes it safe, and every message names a file:

| Refused at build time |
| --- |
| a key no catalog has |
| a translation missing a key the default locale has |
| two catalogs disagreeing about the placeholders inside one key, so `{otp}` cannot become `{code}` in one language |
| a key needing a value nobody passed, or passed a value it has no placeholder for |
| `t` at all when no catalogs are configured |
| a key that is not written out, since a computed one cannot be checked |

Two things reach the types: the locale union, so `to: { locale: "de-DE" }` does not compile
when there is no `de-DE.json`, and the reader has no `locale` at all on the raw `send`
path, because a message you rendered yourself is already in a language.

One rule holds at render time: **the copy is yours and a value is not.** A sentence may
carry markup and it is left alone; a value filled into it is escaped. A key missing from a
reader's locale falls back to the default one.


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

**`resend(...)`** posts to the documented
[Resend HTTP API](https://resend.com/docs/api-reference/emails/send-email) and passes
`baseUrl` straight through, so the same provider code can point at anything speaking that
API. It declares attachments, scheduling, idempotency, reply-to and custom headers, and
takes Resend's own tags, cc and bcc.

It does not wrap the `resend` SDK. The brief asked for the SDK as an optional peer
dependency, and dropping it turned out better on the same axis: there is no peer to make
optional, nothing is dragged in, the `baseUrl` that makes mock-resend work is certain to be
honoured, and the error mapping gets the raw status and body rather than an SDK's tidied
`{ data, error }`. Kywi had already reached the same conclusion and dropped Resend's own
Convex component for it.

Two error kinds never come out of this provider, and that is deliberate. Resend answers
`validation_error` for a bad address, a missing subject and an unverified sending domain
alike, so promoting that to `InvalidRecipient` would have callers drop addresses that are
fine; and a suppression is reported on a webhook rather than at send time, which is a
non-goal here. Both arrive as `Unknown` with the payload kept.

**`memory(...)`** collects messages in an array for tests. No network, synchronous
assertions, a `sent` accessor and a `clear()`:

```ts
import { memory } from "@rapture-sh/mailer/memory";

const provider = memory();
const mailer = createMailer({ provider, from: "Acme <noreply@example.com>", templates });

await mailer.send("account-deletion-code", to, { code: "519204" });

expect(provider.sent).toHaveLength(1);
expect(provider.sent[0].subject).toBe("Your code is 519204");
provider.clear();
```


Local development
-----------------

There is deliberately **no local or dev provider.** For local work, point the `resend`
provider at [mock-resend](https://github.com/rapture-sh/mock-resend) through `baseUrl`.
mock-resend speaks the same HTTP API, keeps an inbox you can look at, and lets no mail
leave your machine:

```ts
resend({
  apiKey: "re_local",
  baseUrl: env.RESEND_BASE_URL,
});
```

```bash
RESEND_BASE_URL=http://localhost:3000 pnpm example:mock
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

[example/](example/README.md) is a small application that uses the package the way a caller
does, running against `src/` rather than a build, so it is the first thing to break when
the public surface moves. It needs no key and no network:

```bash
pnpm example
```


License
-------

MIT. See [LICENSE](LICENSE). Part of [Rapture.sh](https://rapture.sh).
