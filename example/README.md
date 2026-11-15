# example

A small application that uses the package the way a caller does. It runs against `src/`
rather than a build, so it is also the first thing to break when the public surface moves.

```
letters.ts        the senders and the template registry, shared by both scripts
offline.ts        every letter through the memory provider, no network
mock-resend.ts    the same letters through the resend provider, pointed at a mock
```

## Offline

Nothing to install, nothing to run, no API key.

```bash
pnpm example
```

It sends every letter in the registry through the `memory` provider and prints what landed
in its array, including the internal letter that addresses itself and a raw `send` with an
attachment. This is what a test suite does.

## Against mock-resend

[mock-resend](https://github.com/rapture-sh/mock-resend) is a Resend mock you can run
locally: the same HTTP API, an inbox you can look at, and no mail leaving your machine.
Start it, then point this script at it.

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
arrangement cannot be deployed by accident. A deploy that posts real mail into a mock sends
nothing, logs nothing and looks healthy, which is the failure this prevents.

## Against the real API

```bash
RESEND_BASE_URL=https://api.resend.com RESEND_API_KEY=re_... pnpm example:mock
```

It really sends, so change the addresses in `letters.ts` to ones you own first.

## What to look for

- `letters.ts` is the only file with a type written by hand, the field type on each letter.
- Every sender is a key, never an address. Change `from: "auth"` to `from: "atuh"` and it
  does not compile.
- `offline.ts` sends `feedback` with no reader at all, because that letter names its own
  inbox. Add a reader and it still compiles, as an override.
- `mock-resend.ts` passes `sendAt` and `tags`. Move either line into `offline.ts` and it
  stops compiling, because the memory provider declares neither the schedule capability nor
  Resend's options.
