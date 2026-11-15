# Contributing to @rapture-sh/mailer

Thanks for being here. You do not need permission to start, though opening an issue first
is a good way to talk something through. A new provider, or a capability that an existing
provider could declare and does not, is the most useful place to begin.

## The contract

Read [AGENTS.md](AGENTS.md). It is the actual contract for this repo: layout, code style,
testing conventions, and the rules below in full. Everything here assumes it.

Using an AI agent to help? Point it at `AGENTS.md` and the matching playbook in
`.agents/`. The same rules apply to code it writes, including the one about attribution
in commit messages.

One rule outranks everything else here:

> **The five type guarantees are the product.** Template names, per-template fields,
> provider-specific options, capabilities and the result union are checked by the
> compiler, and each one has a type test asserting that the wrong code fails to compile.
> A change that weakens a guarantee needs the failing type test removed in the same
> commit and a note in the README saying what changed.

The second rule is structural, and it is two halves of the same idea:

> **Core never imports a provider SDK, and a provider never implements retry.** Core
> owns the registry, the send surface, error normalisation and backoff. A provider maps
> one API to `MailMessage` in and `MailResult` out. If core needs to know which provider
> it has in order to behave correctly, the design is wrong; the capability type is how a
> provider tells core what it can do.

## Good contributions

- **A new provider.** It needs a capability type, the full error mapping, and type tests
  proving that unsupported options do not compile.
- **A missing capability on an existing provider.** Tags, attachments, idempotency keys,
  reply-to, scheduling. Each one is a capability flag plus options plus type tests.
- **An error-mapping bug.** A provider response that lands in `Unknown`, or in the wrong
  kind, so core retries something hopeless or gives up on something transient. These are
  the most valuable reports, and a report without a fix is still useful.
- **A type hole.** Somewhere the five guarantees say a thing is checked and it is not. A
  failing type test alone is a complete contribution.
- **Documentation.** If something took you an hour to work out, that is a bug in the
  README.

Not sure if an idea fits? Open an issue describing it. That is cheaper than building it
and finding out. The non-goals in the README are settled: no rendering engine, no queue,
no audiences, no inbound parsing, no analytics.

## Setup

Node 22+ and pnpm 10+. The version is pinned through `packageManager`, so Corepack picks
it up.

```bash
pnpm install
```

```bash
pnpm test:watch
```

## Checks

Run this before opening a PR, and make sure it passes:

```bash
pnpm check
```

That is lint, typecheck, the test suite, the type tests, the build, and the published
package checks (`publint` and `attw`) in one go. The parts, when one of them fails and
you want a shorter loop:

```bash
pnpm lint
```

```bash
pnpm typecheck
```

```bash
pnpm test
```

```bash
pnpm test:types
```

```bash
pnpm build
```

Formatting is Biome's call, not yours: `pnpm lint:fix` rather than arguing with it. A
pre-commit hook formats staged files, so a commit should never fail on formatting alone.

`publint` and `attw` run against the built package. A library whose selling point is
types has to prove that its published types resolve for the people installing it, under
every module resolution mode, which is not something the local `tsc` run can tell you.

## Tests

Two tiers, and the second one is the primary suite here.

**Runtime tests** live in `tests/`, in a tree that mirrors `src/`, and use the `memory`
provider. No network, ever.

**Type tests** live in `tests/types/` and run under `vitest --typecheck` with
`expectTypeOf`. They are where the five guarantees are actually enforced, and most of
them are negative: they assert that something does not compile. A feature that adds type
surface is not done until a type test would fail without it.

Every test name starts with `should`. See `AGENTS.md` for the rest.

## Dependencies

Default answer is no. This package has no runtime dependencies and that is a feature: it
goes into Convex functions, edge runtimes and Next server components, where every
transitive dependency is weight on a cold start.

A provider SDK is an **optional peer dependency**, never a dependency. Installing
`@rapture-sh/mailer` must not install `resend`. If a provider needs a new peer, say so in
the PR description and add it to the `exports` map and the peer dependency meta.

## Commits

Commit messages are `feat: ...` or `fix: ...` and **at most two sentences**. No other
prefixes, no essays, no emoji.

```
feat: add the resend provider with scheduling capability
fix: map resend 422 to InvalidRecipient instead of Unknown
```

No `Co-Authored-By:` trailers and no tool or AI attribution footers, in commit messages
or PR descriptions. The person opening the PR is the author.

Branches: `feat/<short-name>` or `fix/<short-name>`, cut from `main`.

## Pull requests

- One logical change per PR.
- Say what it does and why. For an error-mapping fix, say what the provider actually
  returns and how you know, so a doc link or an observed response.
- Type tests for new type surface, a regression test for any bug fixed.
- A changeset (`pnpm changeset`) for anything users would notice. Patch for a fix, minor
  for a feature, major for a change to the five guarantees.
- Note any new peer dependency and why it earned its place.

Reviews are about the code, never the person. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Releasing

For maintainers. Versioning is [Changesets](https://github.com/changesets/changesets);
publishing happens in CI with `npm publish --provenance`, so the registry can attest
which commit and which workflow built the tarball.

A release is a merged version PR. Changesets opens it, keeps it up to date as changesets
land, and publishing runs when it merges. Nobody publishes from a laptop.

## Forking

Fork it, run your own copy, build something else on top; that is what MIT is for. Keep
the copyright notice and credit where the code came from, and we are square.
