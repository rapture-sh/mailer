# with-locales

A small application that uses the package the way a caller does. It runs against `src/`
rather than a build, so it is also the first thing to break when the public surface moves.

```
emails/            one handlebars file per letter, plus the layout they share
copy/              the catalogs, named nothing in particular
build-emails.ts    the build script. in your own repo: scripts/build-emails.mjs
generated/         what the build writes. committed, typechecked, never edited.
mailer.ts          the senders and the registry
send.ts            every letter in both locales through the memory provider
```

## Offline

Nothing to install, nothing to run, no API key.

```bash
pnpm example:locales
```

It sends every letter in both locales through the `memory` provider and prints what landed
in its array: the same letter as "Your Acme login code" and "Dein Acme-Anmeldecode", a
booking as "2 July 2026 at 10:00 / CHF 125.00 / 2 Adult and 1 Child" and "2. Juli 2026 um
10:00 / 2 Adult und 1 Child", the internal letter addressing itself, and a raw `send` with
an attachment. This is what a test suite does.

## Building the letters

```bash
pnpm example:locales:build
```

```bash
pnpm example:locales:build --check
```

The first writes `generated/`, the second fails if what is committed is not what the
letter files produce, which is what belongs in CI. `pnpm examples:check` runs it, and so does `pnpm check`.

**Look at where things are.** The letters are in `emails/`, the catalogs in `copy/`, and
the files are called `english.json` and `swiss-german.json` while the locales are `en-GB`
and `de-CH`. None of that is a convention the package knows about: `build.ts` names the
paths and the locale names are the keys of that map. Call a locale `de`, `de-Test-CH` or
`pirate` and it works the same way.

## Over real HTTP

These letters go through the `memory` provider, which is what a test suite wants. To send
the same thing over the wire at a local mock of the Resend API, and to read it in a
console, see [with-mock-resend](../with-mock-resend/README.md).

## What to look for

- **`emails/magic-code.hbs` declares everything about that letter** and no TypeScript was
  written for it. The `code` field exists because `{{ code }}` is in the body.
- **`emails/booking-confirmation.hbs` is the interesting one.** `participants: number` is
  the only type written by hand; `startsAt` is a moment because `dateTime` formats it,
  `totalMinor` is a number because `money` does, `tickets` is a list of strings because
  `list` joins it, and `voucherCode` is optional because it only appears inside `{{#if}}`.
- **`mailer.ts` holds one hand written letter** beside the generated ones, because
  `password-reset` is three lines of markup with no copy and no layout. Both halves are
  typed the same way at the call site.
- Change `from: auth` to `from: atuh` in a header and the build refuses it. Rename a key in
  `copy/swiss-german.json` and it refuses that too, by name.
- `send.ts` sends `feedback` with no reader at all, because that letter's header names
  its own inbox. Pass one and it still compiles, as an override.
- Add `sendAt` or `tags` to a send in `send.ts` and it stops compiling, because the memory
  provider declares neither the schedule capability nor Resend's own options. The same two
  lines compile in [with-mock-resend](../with-mock-resend/README.md), which is configured
  with the provider that declares them.

Next: [testing](../testing/README.md), for what all of this is for.
