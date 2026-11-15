@rapture-sh/mailer
==================

Typed transactional mail for TypeScript. Write each email once, in as many languages as you
need, and send it by name with the fields it asks for. Test the whole thing without sending
anything to anyone.

```bash
pnpm add @rapture-sh/mailer
```


The problem
-----------

Three things go wrong with transactional email in every project, and we got tired of
solving them again each time.

**You cannot mock it.** Mail is either sent or not sent. There is no middle setting. So
either your tests hit a real provider, where one bad loop floods real people, or you stub
your own mail module and then you are not testing the thing that actually sends. Most
codebases end up with a `if (process.env.NODE_ENV === "test") return` somewhere, which
means the code that runs in production is the one code path nobody ever exercises.

**Templating is never solved.** You need the same email in several languages, wrapped in
one HTML layout that survives Outlook, with dates and money formatted per language. No mail
library does that, so you build it yourself: a folder of templates, a translation lookup,
some helper for currency, a function that glues them together. Every project, from scratch,
slightly differently.

**Nothing is typed.** The template name is a string, the fields are an object, and both are
checked at runtime if at all. A renamed field means an email with a blank in it, found by a
customer rather than by a compiler.

This package is our answer to all three. Letters are files you can hand to a designer,
their fields are read off the markup, the translations live in your own JSON, and the whole
thing runs against [mock-resend](#testing-without-sending-anything) locally so you can
watch mail arrive in a dashboard instead of in someone's inbox.


What you get
------------

- **A mock you can actually use.** The `memory` provider for unit tests, and
  [mock-resend](https://github.com/rapture-sh/mock-resend) for local work: real HTTP, real
  provider code, a dashboard to look at, nothing leaving your machine.
- **Letters as files.** One handlebars file per email, a shared layout, and the build reads
  the field types off the body. No TypeScript to write per email.
- **Translations that are checked.** Your own JSON catalogs, locale names of your own
  choosing, and every key verified against every language before anything ships.
- **Types that mean something.** A typo in a template name, a missing field, a wrong
  locale, an option the configured backend does not support: all compile errors.
- **Results instead of throws**, so retry logic is exhaustive, with backoff in the library
  and never in a provider.
- **No dependencies.** Not one, at runtime or as a peer.


Contents
--------

- [Install](#install)
- [Send one email](#send-one-email)
- [Add a template](#add-a-template)
- [How a letter becomes an email](#how-a-letter-becomes-an-email)
- [Translations](#translations)
- [Testing without sending anything](#testing-without-sending-anything)
- [Providers](#providers)
- [What the compiler catches](#what-the-compiler-catches)
- [Results and errors](#results-and-errors)
- [Retries](#retries)
- [Attachments](#attachments)
- [Compatibility](#compatibility)
- [Not in scope](#not-in-scope)
- [Where it came from](#where-it-came-from)
- [Extending it](#extending-it)
- [License](#license)


Install
-------

```bash
pnpm add @rapture-sh/mailer
```

```bash
npm install @rapture-sh/mailer
```

Node 22 or newer, ESM only, no dependencies. If you want letters as files, the build step
also needs two packages, as dev dependencies only:

```bash
pnpm add -D handlebars yaml
```


Send one email
--------------

Start here. No templates, no types to declare, nothing generated.

```ts
import { createMailer } from "@rapture-sh/mailer";
import { resend } from "@rapture-sh/mailer/resend";

const mailer = createMailer({
  provider: resend({ apiKey: process.env.RESEND_API_KEY ?? "" }),
  senders: { hello: "Acme <hello@acme.example>" },
});

const result = await mailer.send({
  to: { email: "ada@example.com" },
  subject: "Hello",
  html: "<p>Hello from Acme.</p>",
});

if (!result.ok) console.error(result.error.kind);
```

Two things are already different from a bare API call. `senders` is the list of addresses
you are allowed to send from, so mail cannot go out from a mailbox you never set up, and
the result is a value rather than an exception, so a failure is something you branch on.

Swap `resend(...)` for `memory()` and the same code sends nothing and records everything.
That is the whole trick, and it is what the rest of this builds on.


Add a template
--------------

Writing HTML at the call site stops being pleasant around the third email. A template moves
it out of your business logic and gives it a name and typed fields:

```ts
const mailer = createMailer({
  provider: resend({ apiKey: process.env.RESEND_API_KEY ?? "" }),
  senders: { hello: "Acme <hello@acme.example>" },

  templates: ({ letter }) => ({
    "magic-code": letter<{ code: string }>({
      subject: (fields) => `Your code is ${fields.code}`,
      body: (fields, { reader }) => ({
        text: `Hi ${reader.name ?? "there"}, your code is ${fields.code}.`,
        html: `<p>Hi ${reader.name ?? "there"}, your code is <b>${fields.code}</b>.</p>`,
      }),
    }),
  }),
});

await mailer.sendTemplate("magic-code", {
  to: { email: "ada@example.com", name: "Ada" },
  fields: { code: "519204" },
});
```

`letter<{ code: string }>` is the one type you write. From there, `"magic-code"` is the only
name that call accepts and `{ code: string }` is the only field object, both checked by the
compiler. Forget the field, misspell the name, add one that does not exist: none of it
compiles.

That is as far as many projects need to go. Keep reading if you have more than a handful of
emails, or more than one language.


How a letter becomes an email
-----------------------------

Writing markup inside TypeScript gets old fast, and a designer cannot touch it. So a letter
can instead be a file, and a build step turns the folder into the typed registry above.

**1. Write the letter.** One file per email, plus a layout they share. This is plain
handlebars with a small header on top:

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

The header says which mailbox it comes from, what the subject line is, and gives one
example of its fields for previews. Below the fence it is ordinary markup, wrapped in
`layout.hbs`, which holds the table scaffolding and inline styles every email needs and
which you write once.

**2. Run the build.** It is a function, so it lives in a script of yours rather than being
a command this package owns:

```ts
// mail/build.ts
import { build } from "@rapture-sh/mailer/build";

await build({
  letters: "emails",
  out: "mail/templates.ts",
  senders: ["auth", "hello"],
  check: process.argv.includes("--check"),
});
```

**3. What it does.** It reads every letter file and works out, from the markup itself, what
fields that email needs. `{{ code }}` means `code: string`. `{{#if voucher}}` means
`voucher?: string`, optional, along with everything inside the block. `{{#each rows}}` with
`{{ label }}` inside means `rows: readonly { label: string }[]`. Then it compiles each body
to JavaScript (your server has no filesystem at runtime and should not be parsing templates
on every send) and writes one module:

```ts
// mail/templates.ts, generated
export type Letters = {
  "magic-code": { addressed: "caller"; fields: { code: string } };
  // ... one line per letter
};

export const templates = defineTemplates<Letters>({ /* ... */ });
```

**4. Use it.** Hand that to the mailer and every letter is typed at the call site, with no
registry to maintain:

```ts
import { templates } from "./templates";

export const mailer = createMailer({ provider, senders, from: "hello", templates });

await mailer.sendTemplate("magic-code", { to, fields: { code: "519204" } });
```

Adding an email is now one file. No union to extend, no field type to write, no place to
forget.

A few more things the header can do:

| In the header | What it means |
| --- | --- |
| `from: auth` | which of your senders it comes from, checked against the list |
| `inbox: feedback@acme.example` | it comes *to* you, so no caller has to address it |
| `reply-to: email` | read the reply address out of that field |
| `subject: { key: welcome.subject }` | the subject is a [copy key](#translations), not a line of text |
| `fields:` | state a type the markup cannot imply, such as `count: number` |
| `sample:` | typed as that letter's fields, so a preview cannot drift from the letter |

A file with a header is a letter. A file without one is a partial, which is how
`layout.hbs` is recognised without being configured anywhere. `check: true` writes nothing
and reports whether what is committed is current, which is what belongs in CI.


Translations
------------

This is the part everybody rebuilds by hand. An email in four languages, with dates and
money written the way each language writes them, and a subject line that is also
translated.

Your copy is plain JSON, and you keep it wherever you like:

```json
{
  "greeting.named": "Hi {displayName},",
  "magic-code.subject": "Your Acme login code",
  "magic-code.body": "Enter this code to finish signing in. It expires in <b>10 minutes</b>."
}
```

Tell the build where the files are. The locale names are the keys of this map, and nothing
in the package parses them: `de`, `de-CH`, `de-Test-CH` and `pirate` all work.

```ts
await build({
  letters: "emails",
  out: "mail/templates.ts",
  copy: {
    default: "en-GB",
    catalogs: {
      "en-GB": "./locales/english.json",
      "de-CH": "./i18n/swiss-german.json",
    },
    // Values any key may use without being passed them, for the links in every closing.
    values: { supportLink: '<a href="mailto:help@acme.example">help</a>' },
  },
});
```

Now a letter asks for copy by key, and gets formatting for free:

```hbs
---
from: notifications
subject:
  key: booking.subject
---
{{#> layout heading=(t "booking.heading") }}
  <p>{{ t "greeting.named" displayName=reader.name }}</p>
  <p>{{ t "booking.intro" activityName=activityName }}</p>
  <p>{{ dateTime startsAt zone=timezone }}</p>
  <p>{{ t "booking.paid" totalAmount=(money totalMinor currency) }}</p>
  <p>{{ list tickets }}</p>
{{/layout}}
```

- `t` looks a key up in the reader's language and fills in its values.
- `date`, `time`, `dateTime`, `money` and `list` are `Intl`, in the reader's language. You
  pass the timezone, because an event's time belongs to the place it happens in, not to
  wherever the reader opened the email.
- Those helpers also type their arguments: `startsAt` becomes `number | Date`, `totalMinor`
  a `number`, `tickets` a `readonly string[]`.

Then you tell it who is reading, and the locale is typed to the catalogs you actually have:

```ts
await mailer.sendTemplate("booking", {
  to: { email: "ada@example.com", name: "Ada", locale: "de-CH" },
  fields: { activityName: "Kayak tour", startsAt, timezone: "Europe/Zurich", /* ... */ },
});
```

The same letter comes out as "Your booking for Kayak tour is confirmed / 2 July 2026 at
10:00 / CHF 125.00 / 2 Adult and 1 Child", or as "Deine Buchung für Kayak tour ist bestätigt
/ 2. Juli 2026 um 10:00 / CHF 125.00 / 2 Adult und 1 Child", from one file.

**The build refuses to write anything if the translations do not line up**, naming the file
and the key:

| Refused before anything ships |
| --- |
| a key no catalog has |
| a translation missing a key the default language has |
| two languages disagreeing about the placeholders in one key, so `{otp}` cannot quietly become `{code}` in German |
| a key needing a value nobody passed, or passed a value it has no placeholder for |
| a key that is not written out, since a computed one cannot be checked |

One rule at render time: **your copy is yours and a value is not.** A sentence may contain
markup and is left alone; a value filled into it is escaped, so a customer's name cannot
smuggle HTML into your email.


Testing without sending anything
--------------------------------

The reason this package exists, and the part to set up first.

**In unit tests, use the memory provider.** No network, no key, nothing to run:

```ts
import { memory } from "@rapture-sh/mailer/memory";

const provider = memory();
const mailer = createMailer({ provider, senders, templates });

await mailer.sendTemplate("magic-code", { to, fields: { code: "519204" } });

expect(provider.sent).toHaveLength(1);
expect(provider.sent[0]?.subject).toBe("Your Acme login code");
```

It records the whole message: sender, recipient, subject, both bodies, attachments, headers.
`clear()` empties it, and `failNext()` queues errors so you can drive retry and fallback
paths without a clock or a flaky network.

**Locally and in CI, point the real provider at a mock.**
[mock-resend](https://github.com/rapture-sh/mock-resend) is our companion project: it
speaks the Resend HTTP API, keeps the mail it is handed, and shows it to you in a dashboard,
so you can open an email and look at it instead of hoping.

```ts
resend({ apiKey: "re_local", baseUrl: process.env.RESEND_BASE_URL });
```

```bash
RESEND_BASE_URL=http://localhost:3000 pnpm dev
```

That is why there is no "dev" provider in this package, and why there never will be. A dev
provider is a second code path that merely resembles the real one, and the first time it
diverges you find out because a customer did not get an email. Pointing the real provider
at a mock means your tests exercise the code that runs in production, over the same wire
format, with only the host changed.

One guard comes with it: the provider refuses a non-default `baseUrl` when `NODE_ENV` is
`production`. A deploy that quietly posts real mail into a mock sends nothing, logs nothing
and looks perfectly healthy, which is exactly the failure worth preventing.


Providers
---------

**`resend(...)`** posts to the
[Resend HTTP API](https://resend.com/docs/api-reference/emails/send-email) and passes
`baseUrl` through, which is what makes the mock above work. It supports attachments,
scheduling, idempotency keys, reply-to, custom headers, and Resend's own `tags`, `cc` and
`bcc`. It does not wrap the SDK, so nothing is installed alongside it.

**`memory(...)`** is the test provider described above.

A provider is a small interface: one method that takes a finished message and answers a
result, plus a list of what it can do. Adding one is a contained job, and
[pull requests are welcome](#extending-it).

Two error kinds never come out of the Resend provider, deliberately. Resend answers one
validation code for a bad address, a missing subject and an unverified sending domain
alike, so promoting that to `InvalidRecipient` would have callers throw away addresses that
are fine, and suppressions arrive on a webhook rather than at send time. Both come back as
`Unknown` with the payload kept.


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
//             ~~~~~~  not assignable to "auth" | "hello"

to: { email, locale: "de-DE" }
//                   ~~~~~~~  no such catalog: "en-GB" | "de-CH"

mailer.send({ to, subject: "Hi" });
//            ~~  one of html or text is required

mailer.send({ to, subject: "Hi", text: "Hi", sendAt: tomorrow });
//                                           ~~~~~~  this provider cannot schedule

mailer.send({ to, subject: "Hi", text: "Hi", tags: [] });
//                                           ~~~~  tags belong to the Resend provider
```

The last two are worth a second look. Each provider declares what it can do as a type, and
the options you may pass are conditional on it. Asking a backend for something it cannot do
is caught where you write it, rather than coming back as an error response from a code path
nobody exercised.


Results and errors
------------------

`send` and `sendTemplate` do not reject when mail fails. They answer:

```ts
type MailResult = { ok: true; id: string } | { ok: false; error: MailError };
```

`MailError` discriminates on `kind`, and a kind means the same thing whichever provider
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

Exceptions are reserved for programmer error, such as a configuration that cannot work.
Those reject rather than throwing synchronously, so one `catch` covers everything.


Retries
-------

Backoff lives in the library and retries only the transient kinds, so retry behaviour is
one implementation every provider inherits, and the memory provider can drive it without a
network.

```ts
createMailer({
  provider,
  senders,
  retry: { attempts: 3, baseDelayMs: 500, maxDelayMs: 10_000 },
});
```

A provider that says how long to wait is believed, up to `maxDelayMs`. **Providers never
retry.** One maps a response to a `MailError` and returns, because a provider that swallows
a 429 and sleeps is invisible to the caller and untestable from a suite.


Attachments
-----------

The same shape on both send paths:

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
capability makes the option a compile error, and because that capability carries a byte
limit, an oversized message comes back as `PayloadTooLarge` before anything is posted.


Compatibility
-------------

- **Node 22 or newer**, and anywhere else `fetch` and `Intl` exist: edge runtimes,
  serverless functions and bundled server environments included.
- **ESM only.** No CommonJS build.
- **No dependencies**, so nothing lands in your install or your cold start. `handlebars`
  and `yaml` are optional peers used only by the build step.
- Subpaths: `.`, `./resend`, `./memory`, `./build` and `./handlebars`. The published types
  are verified with [publint](https://publint.dev) and
  [are-the-types-wrong](https://arethetypeswrong.github.io) on every change, because a
  package whose selling point is types has to prove its own resolve.


Not in scope
------------

- **No rendering engine of our own.** Letter files are handlebars because that is a format
  designers can read and email clients survive. A caller who prefers JSX, MJML or plain
  template literals writes letters by hand instead, and everything else still applies.
- **No queue and no retry scheduling** beyond the in-process backoff above. A durable queue
  belongs to your runtime, which already has one.
- **No marketing audiences, contacts or lists.**
- **No inbound parsing** of replies or webhooks.
- **No analytics**, opens, clicks or delivery dashboards. Your provider has those.


Where it came from
------------------

It began inside a product monorepo, where sending mail was a handful of hand-written
wrapper functions with no provider behind them and no types on the template fields. Every
new email meant touching four places, nothing could be tested without sending, and the
translations were held together by hand. It was extracted so other projects could use it,
rebuilt around a typed template registry and pluggable providers, and extended well past
the original.


Extending it
------------

It is shaped around what we needed at [Rapture](https://rapture.sh): transactional mail,
several sender mailboxes, a few languages, and tests that never send. That makes it
opinionated in places, and some of it is heavier than a project with one email and one
language needs.

If your needs are different, extend it. **A new provider is the most useful contribution**
and a contained one: implement one method, declare what the backend can do, map its errors
onto the kinds above. SES, Postmark, SMTP and Mailgun are all missing. Capabilities on the
existing providers, body formats, and anything that makes the build step better are all
welcome too.

Read [CONTRIBUTING.md](CONTRIBUTING.md), and [AGENTS.md](AGENTS.md) for the conventions
every change follows, whoever or whatever makes it. Open an issue first if you want to talk
something through.

```bash
pnpm install
```

```bash
pnpm check
```

[example/](example/README.md) is a small application that uses the package the way you
would, letter files and catalogs included. It needs no key and no network:

```bash
pnpm example
```


License
-------

MIT. See [LICENSE](LICENSE). Part of [Rapture.sh](https://rapture.sh).
