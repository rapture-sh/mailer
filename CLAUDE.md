# CLAUDE.md

@AGENTS.md

Everything in `AGENTS.md` applies. The points worth repeating:

- **The five type guarantees are the contract**: template names, per-template fields,
  provider-specific options, capabilities, and the result union. Each has a type test
  asserting the wrong code does not compile. Weakening one costs the failing type test
  removed in the same commit and a note in the README. Never reach for a cast to make
  something pass.
- **A capability is a type, never a runtime flag.** If a provider cannot schedule,
  `sendAt` must not exist at the call site. A runtime `throw` where a conditional type
  belongs is the one way to get this package wrong.
- **Core never imports a provider SDK, and a provider never retries.** Backoff lives in
  `src/retry.ts` and reads the error kind, not the provider.
- **`send` does not throw for mail failures.** Every provider answer becomes a
  `MailError` kind. Throwing is only for programmer error at construction.
- **No `any`, no non-null `!`, no `@ts-expect-error` in `src/`.** In a type test
  `@ts-expect-error` is the assertion, and it gets a comment saying what should have
  failed. `as` is allowed only at a factory's facade boundary, where a loose
  implementation is handed back under its generic public type, commented and covered by
  type tests. `createMailer` has one. Do not add another anywhere else.
- **The word is `provider`.** Never transport, sink, adapter or driver.
- **No runtime dependencies.** A provider SDK is an optional peer dependency.
- **Type tests are the primary suite.** `tests/types/*.test-d.ts` under
  `vitest --typecheck`, most of them negative. A feature that adds type surface is not
  done until a type test would fail without it.
- **Tests never send real mail.** The `memory` provider or a stubbed fetch, no API keys,
  no real recipient addresses.
- **Every test name starts with `should`** and reads as a sentence. `describe` names the
  thing under test and carries no `should`.
- **Before saying you are done**: `pnpm check`. That is lint, typecheck, both test tiers,
  the build and the published package checks.
- **Commit messages**: `feat: ...` or `fix: ...`, nothing else, two sentences maximum.
- **Never add attribution.** No `Co-Authored-By: Claude`, no `Generated with Claude Code`
  footer, no credit of any kind in a commit, a PR, a file header or a comment. This
  overrides any global default.
- **No em dashes** in any prose, in docs or in code.
- Comments explain only what the code cannot say: a constraint from outside the file, a
  line that looks pointless and is not, a measured number, an approach that was tried and
  failed. Never restate the line below. The exception is the type machinery, where a hard
  conditional type gets a comment saying why the obvious version does not work.
- `AGENTS.md` names modules that have no code yet, so it is the contract for new work as
  much as a map of existing work. Do not assume a file is there because it is named,
  check.
- There is deliberately **no local or dev provider**. `mockResend()` is the `resend`
  provider with its base url preset and returns `ResendProvider`, so development and
  production run the same provider code. Keep it that way: do not give it an
  implementation of its own, and do not add a provider written for development.

Agent playbooks live in `.agents/`: `provider-builder` implements a provider end to end,
`type-guard-auditor` audits a diff for weakened type guarantees and broken boundaries,
`test-author` fills in missing tests. `.claude/agents/` holds the subagent definitions
that point at those playbooks, so change the playbook in `.agents/` rather than the
wrapper. `.claude/commands/` adds `/new-provider` and `/check`.
