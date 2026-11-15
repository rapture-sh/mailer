@rapture-sh/mailer
==================

Provider-agnostic, end-to-end type-safe mail for TypeScript. Declare your letters once and
send them by name with typed fields, in any language, through any backend.

**Capabilities are types, not runtime flags.** If the provider you configured cannot
schedule, passing `sendAt` is a compile error rather than a 400 at send time. Nothing else
in the package matters as much as that.

- **No dependencies.** Not one, at runtime or as a peer. The Resend provider posts to the
  HTTP API directly instead of wrapping an SDK.
- **Letters are files.** A handlebars file with a small header, and the build reads the
  field types off the body. No TypeScript to write per letter.
- **Localisation included.** Your own JSON catalogs, locale names of your own choosing, and
  every key checked against every language before anything ships.
- **Results, not throws.** A discriminated union, so retry and fallback logic is
  exhaustively checkable, with backoff in the library and never in a provider.

```bash
pnpm add @rapture-sh/mailer
```


Contents
--------

- [Install](#install)
- [Quick start](#quick-start)
- [Two ways to send](#two-ways-to-send)
- [What the compiler catches](#what-the-compiler-catches)
- [Letters as files](#letters-as-files)
- [Localisation](#localisation)
- [Providers](#providers)
- [Local development](#local-development)
- [Results and errors](#results-and-errors)
- [Retries](#retries)
- [Attachments](#attachments)
- [Compatibility](#compatibility)
- [Not in scope](#not-in-scope)
- [Where it came from](#where-it-came-from)
- [Contributing](#contributing)
- [License](#license)


Install
-------

```bash
pnpm add @rapture-sh/mailer
```

```bash
npm install @rapture-sh/mailer
```

Node 22 or newer, ESM only. The build step additionally needs `handlebars` and `yaml`,
which are optional peer dependencies: anything that only sends mail installs neither.

```bash
pnpm add -D handlebars yaml
```


Quick start
-----------

```ts
import { createMailer } from "@rapture-sh/mailer";
import { resend } from "@rapture-sh/mailer/resend";

export const mailer = createMailer({
  provider: resend({ apiKey: process.env.RESEND_API_KEY ?? "" }),

  // Every address you may send from, by name. A letter names one of these keys.
  senders: {
    auth: "Acme <auth@acme.example>",
    notifications: "Acme <notifications@acme.example>",
  },
  from: "notifications",

  templates: ({ letter, internal }) => ({
    "magic-code": letter<{ code: string }>({
      from: "auth",
      subject: (fields) => `Your code is ${fields.code}`,
      body: (fields, { reader }) => ({
        text: `Hi ${reader.name ?? "there"}, your code is ${fields.code}.`,
        html: `<p>Hi ${reader.name ?? "there"}, your code is <b>${fields.code}</b>.</p>`,
      }),
    }),

    // A letter that comes to you rather than going out. It names the inbox it lands in,
    // so no caller has to address it.
    feedback: internal<{ note: string; from: string }>({
      inbox: "feedback@acme.example",
      subject: "New feedback",
      replyTo: (fields) => fields.from,
      body: (fields) => ({ text: fields.note }),
    }),
  }),
});

const result = await mailer.sendTemplate("magic-code", {
  to: { email: "ada@example.com", name: "Ada" },
  fields: { code: "519204" },
});

if (!result.ok && result.error.kind === "RateLimited") {
  // result.error.retryAfterMs exists on this kind only
}
```

Writing letters by hand like this is fine for a handful. For more than that, keep them as
[files](#letters-as-files) and let the build write the registry.


Two ways to send
----------------

`sendTemplate` takes a name from your registry, with the fields that letter asked for:

```ts
await mailer.sendTemplate("magic-code", {
  to: { email: "ada@example.com", name: "Ada", locale: "de-CH" },
  fields: { code: "519204" },
  idempotencyKey: `magic-code:${requestId}`,
});

// No reader: this letter's own header names the inbox it goes to.
await mailer.sendTemplate("feedback", {
  fields: { note: "The map is slow", from: "host@example.com" },
});
```

`send` takes a message you built yourself, for a one-off or anything you render some other
way. Both return the same result union.

```ts
await mailer.send({
  from: "notifications",
  to: { email: "ada@example.com" },
  subject: `Receipt ${booking.reference}`,
  html: receiptHtml,
  text: receiptText,
});
```

A sender is always a key of what you declared. There is no option anywhere that takes a
bare address, so mail cannot go out from a mailbox you never set up.


What the compiler catches
-------------------------

Every line below fails to compile, and each one is a test in the suite rather than a claim.

```ts
mailer.sendTemplate("magic-cdoe", { to, fields: { code } });
//                   ~~~~~~~~~~~  not a letter in this registry

mailer.sendTemplate("magic-code", { to, fields: {} });
//                                      ~~~~~~  property 'code' is missing

mailer.sendTemplate("magic-code", { to, fields: { code, name } });
//                                                     ~~~~  not a field of this letter

mailer.sendTemplate("magic-code", { fields: { code } });
//                   ~~~~~~~~~~~  this letter needs a reader

letter({ from: "atuh", /* ... */ });
//             ~~~~~~  not assignable to "auth" | "notifications"

to: { email, locale: "de-DE" }
//                   ~~~~~~~  no such catalog: "en-GB" | "de-CH"

mailer.send({ to, subject: "Hi" });
//            ~~  one of html or text is required

mailer.send({ to, subject: "Hi", text: "Hi", sendAt: tomorrow });
//                                           ~~~~~~  this provider cannot schedule

mailer.send({ to, subject: "Hi", text: "Hi", tags: [] });
//                                           ~~~~  tags belong to the Resend provider
```

The last two are the interesting ones. A provider declares what it can do as a type, and
the options at the call site are conditional on it, so asking a backend for something it
does not support is caught where you write it instead of coming back as an error response
from a code path nobody exercised.


Letters as files
----------------

A letter is one handlebars file with a header. The build reads the fields off the body, so
there is no type to write per letter and no registry to maintain.

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
  <p><b>{{ code }}</b></p>
{{/layout}}
```

No `fields:` block there, because a placeholder is a `string` until the header says
otherwise. What the body implies:

| In the body | The field becomes |
| --- | --- |
| `{{ code }}` | `code: string` |
| `{{#if voucher}}` | `voucher?: string`, along with everything inside the block |
| `{{#each rows}}{{ label }}` | `rows: readonly { label: string }[]` |
| `{{#each parts}}{{ this }}` | `parts: readonly string[]` |
| `{{ date startsAt zone=timezone }}` | `startsAt: number \| Date` and `timezone: string` |
| `{{ money total currency }}` | `total: number` and `currency: string` |
| `{{ list parts }}` | `parts: readonly string[]` |
| `{{ reader.name }}` | nothing, the context supplies it |
| `fields:` in the header | exactly what you wrote, for anything a body cannot imply |

A file with a header is a letter. A file without one is a partial, which is how a shared
layout is recognised without being named anywhere. `inbox:` makes a letter internal, so no
caller addresses it, and `reply-to:` names the field to read a reply address out of.

The build is a function, not a command, so it goes in a script of your own:

```ts
// mail/build.ts
import { build } from "@rapture-sh/mailer/build";

await build({
  letters: "emails",
  out: "mail/templates.ts",
  senders: ["auth", "notifications"],
  check: process.argv.includes("--check"),
});
```

It writes two files. `templates.ts` is the typed registry, ordinary TypeScript your own
compiler checks, and `templates.bodies.ts` holds what handlebars' precompiler emits, which
is unannotated JavaScript carrying a `@ts-nocheck` and nothing else. They are separate so
that one suppression cannot cover the types. Hand the registry over and every letter is
typed at the call site:

```ts
import { templates } from "./templates";

export const mailer = createMailer({ provider, senders, from: "notifications", templates });
```

`check: true` writes nothing and reports whether what is committed is current, which is
what belongs in CI. The `sample:` in each header is typed as that letter's fields, so a
preview cannot drift from the letter it previews, and a letter the format cannot express
stays declarable by hand beside the generated ones.


Localisation
------------

The copy is your own JSON, wherever it lives and whatever you call your locales.

```ts
await build({
  letters: "emails",
  out: "mail/templates.ts",
  copy: {
    default: "en-GB",
    catalogs: {
      "en-GB": "./locales/english.json",
      "de-CH": "./i18n/swiss-german.json",
      pirate: "./copy/pirate.json",
    },
    // Values every key may use without being passed them, for the links in every
    // closing. Yours, so they go in as written; a caller's values are escaped.
    values: { supportLink: '<a href="mailto:help@acme.example">help</a>' },
  },
});
```

**The locale names are the keys of that map and nothing parses them.** `de`, `de-CH`,
`de-Test-CH`, `pirate` and `internal-debug-9` all work. A name reaches `Intl` only when
something is formatted, and one it cannot read falls back to the default locale rather than
failing to send. A directory works too, where each file's name is its locale:

```ts
copy: { default: "en-GB", catalogs: "./locales" }
```

A catalog is a flat map of key to sentence:

```json
{
  "greeting.named": "Hi {displayName},",
  "magic-code.subject": "Your Acme login code",
  "magic-code.body": "Enter this code to finish signing in. It expires in <b>10 minutes</b>."
}
```

In a letter, `t` takes a key and the values that key asks for, and `date`, `time`,
`dateTime`, `money` and `list` are `Intl` in the reader's locale. A subject can be a key
rather than a line of text, written `subject: { key: ... }`.

The reader carries the locale, typed to the catalogs you actually have:

```ts
await mailer.sendTemplate("magic-code", {
  to: { email: "ada@example.com", name: "Ada", locale: "de-CH" },
  fields: { code: "519204" },
});
```

What the build refuses, each message naming the file it came from:

| Refused before anything ships |
| --- |
| a key no catalog has |
| a translation missing a key the default locale has |
| two catalogs disagreeing about the placeholders inside one key, so `{otp}` cannot become `{code}` in one language |
| a key needing a value nobody passed, or passed a value it has no placeholder for |
| `t` at all when no catalogs are configured |
| a key that is not written out, since a computed one cannot be checked |

One rule holds at render time: **the copy is yours and a value is not.** A sentence may
carry markup and is left alone; a value filled into it is escaped. A key missing from a
reader's locale falls back to the default one.


Providers
---------

**`resend(...)`** posts to the
[Resend HTTP API](https://resend.com/docs/api-reference/emails/send-email) and passes
`baseUrl` straight through. It declares attachments, scheduling, idempotency, reply-to and
custom headers, and takes Resend's own `tags`, `cc` and `bcc`. No SDK, so nothing is
installed alongside it.

```ts
resend({ apiKey: process.env.RESEND_API_KEY ?? "", baseUrl: process.env.RESEND_BASE_URL });
```

**`memory(...)`** collects messages in an array for tests: no network, synchronous
assertions, a `sent` accessor, a `clear()`, and a `failNext()` that queues errors so retry
behaviour can be driven without a clock.

```ts
import { memory } from "@rapture-sh/mailer/memory";

const provider = memory();
const mailer = createMailer({ provider, senders, templates });

await mailer.sendTemplate("magic-code", { to, fields: { code: "519204" } });

expect(provider.sent[0]?.subject).toBe("Your code is 519204");
```

Two error kinds never come out of the Resend provider, deliberately. Resend answers one
validation code for a bad address, a missing subject and an unverified sending domain
alike, so promoting that to `InvalidRecipient` would have callers drop addresses that are
fine, and a suppression is reported on a webhook rather than at send time. Both arrive as
`Unknown` with the payload kept.


Local development
-----------------

There is deliberately **no dev provider.** For local work, point the `resend` provider at a
mock of the Resend API through `baseUrl`:

```ts
resend({ apiKey: "re_local", baseUrl: process.env.RESEND_BASE_URL });
```

Development and CI then exercise the provider code that runs in production, over the same
wire format, with only the host changed. A separate dev provider would be a second code
path that merely resembles the real one, and the first time it diverged nobody would find
out until a letter did not arrive.

One guard comes with that: the provider refuses a non-default `baseUrl` when `NODE_ENV` is
`production`. A deploy that posts real mail into a mock sends nothing, logs nothing and
looks healthy, which is the failure this prevents.


Results and errors
------------------

`sendTemplate` and `send` do not reject on a mail failure. They answer:

```ts
type MailResult = { ok: true; id: string } | { ok: false; error: MailError };
```

`MailError` discriminates on `kind`, and a kind means the same thing whatever provider
produced it. Normalising that across providers is most of the work in this package.

| Kind | What happened | Retried |
| --- | --- | --- |
| `RateLimited` | The provider asked you to slow down. Carries `retryAfterMs` where it says. | yes |
| `ProviderDown` | 5xx, a timeout, or a transport failure. | yes |
| `InvalidRecipient` | The address is not deliverable and will not become deliverable. | no |
| `Suppressed` | The recipient is on the provider's suppression list. | no |
| `AuthFailed` | The API key was rejected. | no |
| `PayloadTooLarge` | The message is over the provider's size limit. | no |
| `Unknown` | Nothing mapped. Carries the original payload so you can look. | no |

Throwing is reserved for programmer error, such as a configuration that cannot work. Those
reject rather than throwing synchronously, so one `catch` covers everything.


Retries
-------

Backoff lives in the library and retries only the transient kinds, so retry behaviour is
one implementation every provider inherits and the memory provider can drive without a
network.

```ts
createMailer({
  provider,
  senders,
  retry: { attempts: 3, baseDelayMs: 500, maxDelayMs: 10_000 },
});
```

A provider that says how long to wait is believed, up to `maxDelayMs`. **Providers never
retry**: one maps a response to a `MailError` and returns, because a provider that swallows
a 429 and sleeps is invisible to the caller and untestable from a suite.


Attachments
-----------

The same shape on both send paths, and gated by the provider:

```ts
await mailer.send({
  to,
  subject: `Receipt ${booking.reference}`,
  html: receiptHtml,
  attachments: [
    { filename: "receipt.pdf", content: pdfBytes, contentType: "application/pdf" },
    { filename: "logo.png", content: logoBytes, inline: { cid: "logo" } },
  ],
});
```

`content` takes bytes or a base64 string. A provider that does not declare the attachments
capability makes the option a compile error, and because the capability carries a byte
limit, an oversized message comes back as `PayloadTooLarge` before anything is posted.


Compatibility
-------------

- **Node 22 or newer**, and anywhere else `fetch` and `Intl` exist: edge runtimes,
  serverless functions and bundled server environments included.
- **ESM only.** No CommonJS build.
- **No dependencies**, so nothing is pulled into your install or your cold start.
- Subpaths: `.`, `./resend`, `./memory`, `./build` and `./handlebars`. The published types
  are verified with [publint](https://publint.dev) and
  [are-the-types-wrong](https://arethetypeswrong.github.io) on every change, because a
  package whose selling point is types has to prove its own resolve.


Not in scope
------------

Kept out on purpose, so this stays a typed send surface:

- **No rendering engine in the library.** A letter returns strings. The build compiles
  handlebars because that is what letter files are written in, and a caller who prefers
  JSX, MJML or plain template literals writes letters by hand instead.
- **No queue and no retry scheduling** beyond the in-process backoff above. A durable
  queue belongs to your runtime.
- **No marketing audiences, contacts or lists.**
- **No inbound parsing** of replies or webhooks.
- **No analytics**, opens, clicks or delivery dashboards. Your provider has those.


Where it came from
------------------

It began inside a product monorepo, where sending mail was a handful of hand-written
wrapper functions with no provider behind them and no types on the template fields. It was
extracted so other projects could use it, rebuilt around a typed template registry and
pluggable providers, and extended well past the original.


Contributing
------------

Read [CONTRIBUTING.md](CONTRIBUTING.md), and [AGENTS.md](AGENTS.md) for the conventions
every change follows, whoever or whatever makes it.

```bash
pnpm install
```

```bash
pnpm check
```

[example/](example/README.md) is a small application that uses the package the way a caller
does, letter files and catalogs included. It needs no key and no network:

```bash
pnpm example
```


License
-------

MIT. See [LICENSE](LICENSE). Part of [Rapture.sh](https://rapture.sh).
