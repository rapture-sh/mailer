# example

A small application that uses the package the way a caller does. It runs against `src/`
rather than a build, so it is also the first thing to break when the public surface moves.

```
emails/            one handlebars file per letter, plus the layout they share
copy/              the catalogs, named nothing in particular
build.ts           the build script, which is yours rather than a command we ship
generated/         what the build writes. committed, typechecked, never edited.
mailer.ts          the senders and the registry, shared by both scripts
offline.ts         every letter in both locales through the memory provider
mock-resend.ts     the same letters through the resend provider, pointed at a mock
```

## Offline

Nothing to install, nothing to run, no API key.

```bash
pnpm example
```

It sends every letter in both locales through the `memory` provider and prints what landed
in its array: the same letter as "Your Acme login code" and "Dein Acme-Anmeldecode", a
booking as "2 July 2026 at 10:00 / CHF 125.00 / 2 Adult and 1 Child" and "2. Juli 2026 um
10:00 / 2 Adult und 1 Child", the internal letter addressing itself, and a raw `send` with
an attachment. This is what a test suite does.

## Building the letters

```bash
pnpm example:build
```

```bash
pnpm example:build --check
```

The first writes `generated/`, the second fails if what is committed is not what the
letter files produce, which is what belongs in CI. `pnpm check` runs it.

**Look at where things are.** The letters are in `emails/`, the catalogs in `copy/`, and
the files are called `english.json` and `swiss-german.json` while the locales are `en-GB`
and `de-CH`. None of that is a convention the package knows about: `build.ts` names the
paths and the locale names are the keys of that map. Call a locale `de`, `de-Test-CH` or
`pirate` and it works the same way.

## Against mock-resend

[mock-resend](https://github.com/rapture-sh/mock-resend) is a Resend mock you can run
locally: the same HTTP API, an inbox you can look at, and no mail leaving your machine.

```bash
RESEND_BASE_URL=http://localhost:3000 pnpm example:mock
```

Use whatever port mock-resend tells you it is listening on.

**This is why the package ships no dev provider.** Pointing the `resend` provider at a mock
means development and CI exercise the provider code that runs in production, over the same
wire format, with only the host changed. A separate dev provider would be a second code
path that merely resembles the real one, and the first time it diverged nobody would find
out until a letter did not arrive.

The provider refuses a non-default `baseUrl` when `NODE_ENV` is `production`, so this
arrangement cannot be deployed by accident.

## Against the real API

```bash
RESEND_BASE_URL=https://api.resend.com RESEND_API_KEY=re_... pnpm example:mock
```

It really sends, so change the addresses in `mailer.ts` to ones you own first.

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
- `offline.ts` sends `feedback` with no reader at all, because that letter's header names
  its own inbox. Pass one and it still compiles, as an override.
- `mock-resend.ts` passes `sendAt` and `tags`. Move either line into `offline.ts` and it
  stops compiling, because the memory provider declares neither the schedule capability nor
  Resend's own options.
