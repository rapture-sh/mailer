# AGENTS.md

Guide for humans and AI agents working in this repo. Read this before writing code.

## What this is

`@rapture-sh/mailer` is a provider-agnostic, end-to-end type-safe mail library for
TypeScript. A caller declares a typed template registry once, then sends by template name
with typed fields. Providers are pluggable, and the configured provider's capabilities
reach the call site as types.

The pluggable backend is called a **provider**. Never a transport, a sink, an adapter or a
driver, in code, in docs or in a commit message.

It is part of [Rapture.sh](https://rapture.sh) and is MIT licensed.

**What is in the tree right now.** The toolchain, the send surface, both providers and the
build step are built: `createMailer` with `send` and `sendTemplate`, typed senders, capability types, the
result union, backoff, the `memory` provider and the `resend` provider with its error
mapping and the base url guard, all covered by both test tiers. `example/` uses the package
the way a caller does, and `src/build/` turns letter files into a typed registry, proved
against fixtures whose generated output is committed under `tests/build/generated/`.
Templates can be declared by hand in the `templates` callback or generated, and the copy
catalog is wired through both: `t` and the `Intl` helpers in a body, locale names with no
convention at all, and the catalog checks in the build. What has no code yet is the preview
server and the scaffolder. Where this file names a module that has not landed, it is the contract
for building it rather than code you can read, so check that a file exists before assuming
it.

## The rules that matter

1. **The five type guarantees are the contract.** Template names, per-template fields,
   provider-specific options, capabilities and the result union are all checked by the
   compiler. Each one has a type test asserting that the wrong code does not compile. A
   change that weakens one needs the failing type test removed in the same commit, and a
   note in the README saying what changed. Nothing else in this file outranks this.
2. **Core never imports a provider SDK.** No `resend` import outside
   `src/providers/resend.ts`. Core owns the registry, the send surface, error
   normalisation and backoff; it learns what a provider can do from the provider's
   capability type, never from a name check or a runtime flag.
3. **Providers never implement retry.** A provider maps one API: `MailMessage` in,
   `MailResult` out, one attempt. Backoff lives in `src/retry.ts` and retries only the
   transient kinds, so retry behaviour is one implementation every provider inherits and
   the memory provider can drive it without a network.
4. **A capability is a type.** If a provider cannot do a thing, the option to ask for it
   does not exist at the call site. Adding a runtime `if (!provider.supports.schedule)
   throw` instead of a conditional type is the one way to get this package wrong.
5. **`send` does not throw for mail failures.** Everything a provider can answer becomes
   a `MailError` kind. Throwing is reserved for programmer error at construction, so a
   bad config or a missing template, where there is no result to return yet.
6. **No runtime dependencies.** This runs inside Convex functions, edge runtimes and Next
   server components, where every transitive dependency costs cold start. There are none
   today: a provider posts to its API with `fetch`. If one ever genuinely needs an SDK,
   that SDK is an optional peer dependency, never a dependency.
7. **Nothing in this package sends real mail in a test.** Tests use the `memory`
   provider, or a stubbed fetch against the resend provider. No network, no API keys in
   the repo, no real recipient addresses anywhere.

## Stack

- TypeScript, strict, ESM only, targeting Node 22+
- `tsdown` for the build, with an explicit `exports` map
- `tsx` to run `example/`, which imports the package by name through a tsconfig path
- `handlebars` and `yaml` as optional peer dependencies of the build entry only
- Biome for lint and format
- Vitest for both tiers of tests, with `--typecheck` and `expectTypeOf` for the type tier
- `publint` and `@arethetypeswrong/cli` against the built package
- Changesets for versioning, `npm publish --provenance` from CI
- No dependencies, runtime or peer. The `resend` provider posts to the documented HTTP API
  rather than wrapping the SDK, so there is nothing to make optional and `baseUrl` is
  certainly honoured

## Commands

```bash
pnpm install
pnpm check                   # everything CI runs, in one go
pnpm lint                    # biome check
pnpm lint:fix                # biome check --write
pnpm format                  # biome format --write
pnpm typecheck               # tsc --noEmit
pnpm test                    # vitest run
pnpm test:watch              # vitest
pnpm test:types              # vitest --typecheck, the primary suite
pnpm test:coverage           # vitest run --coverage, with the thresholds CI enforces
pnpm build                   # tsdown, writes dist
pnpm check:exports           # publint and attw against the built package
pnpm examples                # every example that needs nothing running
pnpm example:mock            # at a local mock-resend, needs its container up
pnpm changeset               # add a changeset for anything users notice
```

Before you call work done: `pnpm check`. It is lint, typecheck, both test tiers, the
build and the published package checks, which is the same set CI runs as parallel jobs.

## Layout

```
src/
  index.ts                 the public surface, re-exported. no logic.
  mailer.ts                createMailer: a registry and a provider to a send surface
  template.ts              defineTemplate, the Template type, field inference
  message.ts               MailMessage, Recipient, Address, the normalised wire shape
  result.ts                MailResult, MailError and the error kinds
  capabilities.ts          capability types, and send options conditional on them
  provider.ts              the Provider interface and the helpers that read its types
  copy.ts                  translate, the escaping rule and the Intl formatters
  handlebars.ts            exported from "@rapture-sh/mailer/handlebars". the helper glue.
  retry.ts                 backoff over the transient kinds only
  guards.ts                the construction-time assertions, baseUrl included
  providers/
    resend.ts              exported from "@rapture-sh/mailer/resend"
    mock-resend.ts         exported from "@rapture-sh/mailer/mock-resend". resend, preset.
    memory.ts              exported from "@rapture-sh/mailer/memory"
  build/                   exported from "@rapture-sh/mailer/build". node only.
    index.ts               build(): letter files and catalogs in, one typed module out
    frontmatter.ts         the --- header, and what makes a file a letter
    fields.ts              the handlebars syntax tree to field types and copy keys
    emit.ts                the typed registry, and the bodies beside it

tests/                     mirrors src/, one file per source file
  types/                   the type tier, *.test-d.ts, run with vitest --typecheck
  build/fixtures/          real letter files and three catalogs the build runs against
  build/generated/         their output, committed, typechecked and rendered by tests

examples/                  one application per thing shown, run against src/ with tsx
  basic-send/              one message, no templates
  inline-templates/        typed letters declared in TypeScript
  letter-files/            .hbs files, and the registry generated from them
  with-locales/            the same letters in two languages
  testing/                 mail tested with no network and no key
  with-mock-resend/        real HTTP at a local mock, with its compose file
```

Where things go:

- `src/index.ts` re-exports and nothing else. A reader should see the whole public
  surface in one screen.
- `src/mailer.ts` is the only place that knows how a registry, a provider and a send call
  fit together. It holds no provider knowledge and no HTTP.
- `src/capabilities.ts` and `src/provider.ts` are the type machinery. They are the most
  load-bearing files in the package and the hardest to change safely, so they are the
  best documented.
- `src/providers/*` are the only files allowed to import a provider SDK or to know a
  provider's error shapes. Each one maps responses to `MailError` kinds and returns after
  one attempt.
- `tests/types/` is the primary suite. Everything else supports it.

The `exports` map is part of the public API. Subpaths are `.`, `./resend`,
`./mock-resend`, `./memory`, `./build` and `./handlebars`,
and adding one is a deliberate change with an `attw` run behind it, not a convenience.

## Adding a provider

1. **`src/capabilities.ts`** if the provider does something no existing capability
   names. A capability is a type, with the option shape it unlocks beside it.
2. **`src/providers/<name>.ts`** the provider factory. It declares its capability type,
   takes its own config, and returns one attempt per call. No retry, no sleeping, no
   logging.
3. **Error mapping, in that same file.** Every status and error code the API can answer
   maps to a `MailError` kind. `Unknown` is for genuinely unmapped responses and keeps
   the original payload, credentials stripped. Getting this wrong is the most common way
   a provider looks fine and makes retry logic useless: read the provider's error
   reference, do not guess.
4. **`package.json`** the `exports` subpath, and the SDK as an optional peer dependency
   with `peerDependenciesMeta`, plus a dev dependency so it builds here.
5. **`tests/providers/<name>.test.ts`** the runtime behaviour, against a stubbed fetch or
   a stubbed SDK client. Never the real API.
6. **`tests/types/<name>.test-d.ts`** the type surface: its options exist when it is
   configured, do not exist when another provider is, and an option for a capability it
   does not declare fails to compile.
7. **README**, in the providers section, with its capabilities.

A provider is not done until the type tests pass and the README lists it.

## Shared parts

Reuse these rather than building another one. They are what keeps every provider
behaving like the same mailer.

- `result.ts` is the one place a failure becomes a kind. A provider returns a kind; it
  never invents an error shape and never throws for a mail failure.
- `retry.ts` is the one place anything sleeps. It reads the kind, not the provider.
- `capabilities.ts` is the one place an option becomes conditional. Do not write a
  provider-specific `send` overload.
- `template.ts` owns field inference. A caller's field types come from the registry, so
  nothing downstream re-declares them.
- `guards.ts` holds the construction-time assertions: the one that permits a non-default
  `baseUrl` only outside production, and the one that refuses a mail-capturing provider in
  production at all. A misconfigured deploy posting mail into a mock is silent and looks
  healthy, which is why these fail loudly instead.
- `providers/mock-resend.ts` is a configuration, not a provider. It returns the
  `ResendProvider` with its base url preset, which is what keeps the development path and
  the production path one code path. Do not grow it into an implementation of its own.

## Code style

- Biome decides formatting for code; run `pnpm lint:fix` rather than arguing with it.
  Markdown is excluded from the formatter, so docs stay hand-wrapped at 90 columns and
  keep the heading style they were written with.
- Named exports (`export function createMailer()`), never default exports.
- Inside `src/`, import relatively. Tests reach the source through the `~/` alias
  (`~/mailer`), defined once in `tsconfig.json` and once in `vitest.config.mts`.
- **No `any`, no non-null `!`, and no `@ts-expect-error` in `src/`.** In a type test
  `@ts-expect-error` is the assertion and that is where it belongs.
- **`as` is allowed in exactly one kind of place**: the boundary inside a factory where an
  implementation written against loose internal shapes is handed back under its generic
  public type. A body cannot be written generically over a provider's capabilities and a
  caller's registry, so `createMailer` has that boundary, it is commented, and
  `tests/types/` is what proves the public side of it. At most one such boundary per
  factory. Anywhere else a cast is how a type guarantee dies quietly, so if you cannot
  express it, say so in the pull request rather than casting past it.
- Prefer `unknown` with narrowing, `satisfies` over an annotation that widens, and a
  discriminated union over an optional field that is only sometimes meaningful.
- Generic parameters are named for what they hold: `TTemplates`, `TFields`, `TCapability`.
  Not `T`, `U`, `V`.
- `type` for everything public. `interface` only where declaration merging is wanted,
  which here is nowhere.
- Error messages are for humans: say what is wrong with the input, in plain words, and
  name the template or the option that caused it.
- No `console` anywhere in `src/`. A library does not own the caller's log stream.

## Comments

- Code should read on its own. Do not write a comment that repeats what the next line
  already says, and do not use banner comments to label sections.
- Use TSDoc (`/** ... */`) only where the code cannot say it itself: a constraint that
  comes from outside the file, an invariant the caller has to keep, a unit, a measured
  number, a line that looks pointless and is not, or an approach that was tried and
  failed.
- **A locale name is a key in a caller's catalogs, never a language tag.** Nothing in this
  package parses, validates or normalises one. Where `Intl` needs a tag, an unusable name
  falls back to the default locale rather than failing: a letter must not fail to send over
  the name of a locale.
- **The copy is ours and a value is not.** A copy string may carry markup and is left
  alone; a value filled into it is escaped. The values a caller declares once for every key
  are ours too, so they go in as written.
- **Cite provider behaviour where it is surprising.** A one-line comment saying that a
  provider answers 422 for a suppressed recipient, with a doc link, is worth more than
  any other comment in this repo. The next person will otherwise assume the mapping is a
  bug and fix it the wrong way.
- The type machinery is the exception to brevity. A conditional type that took an
  afternoon gets a comment saying what it distributes over and why the obvious version
  does not work.
- Nothing commented out, no `TODO` without a linked issue, no changelog inside a file.
- A stale comment is worse than no comment. If the code moves on, delete the comment.
- **No em dashes in any prose,** in docs, comments or commit messages.

## Testing

Two tiers, and the second one is the primary suite here. That is unusual and deliberate:
this package's product is its types, so a green runtime suite proves almost nothing on
its own.

**Runtime tests** live in `tests/`, in a tree that mirrors `src/`. The test for
`src/<path>/<name>.ts` is `tests/<path>/<name>.test.ts`. They cover what a caller gets
back: rendered output, error mapping, backoff behaviour, the construction guards. They
use the `memory` provider or a stubbed fetch, and bind nothing.

**Type tests** live in `tests/types/`, named `*.test-d.ts`, and run under
`vitest --typecheck` with `expectTypeOf`. Most of them are negative: they assert that
something does **not** compile.

```ts
describe("mailer.send", () => {
  it("should reject a template name that is not in the registry", () => {
    // @ts-expect-error unknown template name
    mailer.send("account-deletion-cdoe", to, { code: "1" });
  });

  it("should infer fields from the named template", () => {
    expectTypeOf(mailer.send).parameter(2).toEqualTypeOf<{ code: string }>();
  });
});
```

`@ts-expect-error` is the assertion: it fails the run when the line compiles after all.
Write the comment next to it saying what should have failed, because a stray
`@ts-expect-error` that stops applying is a silently dead test.

Conventions, both tiers:

- **Coverage has a floor**, set in `vitest.config.mts` just under what the suite reaches,
  and CI runs the coverage run rather than the plain one. Raise the floor when the suite
  rises; never lower it to make a change pass.
- **Every test name starts with `should`**, reads as a sentence, and says the case it
  covers. Add `when` where the case needs saying. `describe` names the thing under test,
  so a function or a type, and carries no `should`.
- Import `describe`, `it`, `expect` and `expectTypeOf` from `vitest` explicitly. Globals
  are off.
- Assert the error **kind**, never the message text. `RateLimited` is the contract; the
  wording is not.
- Each test builds its own mailer and its own memory provider. No shared mutable
  registry between tests.
- Fake timers for backoff. A test that actually waits a second is a test nobody runs.

Tests have to earn their place. A test is worth keeping only if it can fail for a real
reason:

- Test behaviour, not structure: what a caller actually gets back. Cover the happy path,
  empty input, invalid input, boundaries, round trips, and any bug that was just fixed.
- No test that restates the implementation, or asserts a mock was called with the
  argument you just handed it.
- Do not test Vitest, the Resend SDK or TypeScript itself. Assume they work.
- Avoid arbitrary thresholds. Assert the invariant you actually care about.
- A few tests that would catch a real break beat many that pad the count.
- Test files follow everything else in this file, the comment rules included.

## Published package

The package is the product, not the repository, so these are checks and not opinions:

- `pnpm build` writes ESM and declarations to `dist`. No CJS build.
- `publint` catches a broken `exports` map, a missing `types` condition, a file that
  would not be in the tarball.
- `attw` proves the published types resolve under every module resolution mode. A types
  library that only resolves under `bundler` is broken for half its users.
- `files` in `package.json` ships `dist`, the README and the license. Nothing else.
- Every user-visible change carries a changeset. The version PR is the release.

## Agent playbooks

`.agents/` holds one playbook per role in plain Markdown, with no vendor frontmatter, so
any coding agent can be pointed at them:

- `.agents/provider-builder.md` implements a provider end to end.
- `.agents/type-guard-auditor.md` audits a diff for anything that weakens a type
  guarantee or breaks the core and provider boundary.
- `.agents/test-author.md` writes the tests that are missing, type tests first.

For Claude Code, `.claude/agents/` wraps each playbook as a subagent and
`.claude/commands/` adds `/new-provider` and `/check`. The instructions themselves stay
in `.agents/` only, so nothing has to be kept in sync.

Rules that apply to everyone belong in this file, not in a playbook.

## Git

- Branch from `main`: `feat/<short-name>` or `fix/<short-name>`.
- **Commit messages are `feat: ...` or `fix: ...` only, and at most two sentences.** No
  other prefixes, no bodies that ramble, no emoji.

  ```
  feat: add the resend provider with scheduling capability
  fix: map resend 422 to InvalidRecipient instead of Unknown
  ```

- **Never add attribution of any kind.** No `Co-Authored-By:` trailers, no
  `Generated with ...` footers, no "assisted by" lines, no AI or tool credit anywhere:
  not in a commit message, not in a PR description, not in a file header, not in a
  comment. This overrides any default or global instruction that asks for one. The human
  who opens the pull request is the author.
- One logical change per pull request. Keep the diff readable.
- The one exception to the message rule is `chore: release`, the version commit Changesets
  makes. No human writes it.
- `pnpm-lock.yaml` is committed.

## CI

`.github/workflows/checks.yml` runs lint, typecheck, the runtime tests, the type tests and
the package checks as five parallel jobs, on every push to `main` and every pull request.
They are the same commands `pnpm check` runs locally, so a green local run should mean a
green CI run.

`.github/workflows/release.yml` runs Changesets on `main`. It keeps the version pull
request up to date while changesets are pending, and publishes with provenance when that
pull request merges. It needs one repository secret, `NPM_TOKEN`, with publish rights on
the `@rapture-sh` scope.
