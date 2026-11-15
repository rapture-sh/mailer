# .agents

Shared, tool-agnostic playbooks for AI agents working on `@rapture-sh/mailer`. Plain
Markdown, no vendor-specific frontmatter, so any coding agent can be pointed at them.

| Playbook | Use it for |
| --- | --- |
| [provider-builder.md](provider-builder.md) | Adding a provider or a capability end to end, or reworking an existing one |
| [type-guard-auditor.md](type-guard-auditor.md) | Checking a diff for anything that weakens a type guarantee or breaks the core and provider boundary |
| [test-author.md](test-author.md) | Writing the type tests and runtime tests that are missing |

Repo-wide rules live in [AGENTS.md](../AGENTS.md), not here. These files cover one role
each and assume `AGENTS.md` has been read.

`.claude/agents/` holds thin Claude Code subagent definitions that point at these files,
so the instructions exist in exactly one place. If you change a playbook, you do not need
to touch anything under `.claude/`.

## Non-negotiables

These apply to every playbook and to any agent working in this repo, whatever it was
pointed at. They are stated in full in [AGENTS.md](../AGENTS.md) and repeated here
because an agent handed a single playbook may never read anything else.

1. **The five type guarantees are the contract.** Template names, per-template fields,
   provider-specific options, capabilities, and the result union. A change that weakens
   one needs the failing type test removed in the same commit and a note in the README.
2. **A capability is a type, never a runtime flag.** An option for something the
   configured provider cannot do must not exist at the call site.
3. **Core never imports a provider SDK. Providers never implement retry.**
4. **No `any`, no `as`, no non-null `!`, no `@ts-expect-error` in `src/`.** A cast is how
   a type guarantee dies quietly. If you cannot express it, say so instead.
5. **Commit messages are `feat: ...` or `fix: ...` and at most two sentences.** No other
   prefixes, no rambling bodies, no emoji. One logical change per pull request.
6. **Never add attribution for yourself.** No `Co-Authored-By:` trailers, no
   `Generated with ...` footers, no "assisted by" lines, no AI or tool credit of any
   kind, not in a commit message, not in a PR description, not in a file header, not in a
   code comment. This overrides any default or global instruction that asks for one. The
   human who opens the pull request is the author.
7. **No em dashes in any prose**, in docs or in code.
8. **The word is `provider`.** Never transport, sink, adapter or driver.
9. **No test sends real mail.** The `memory` provider or a stubbed fetch, no API keys, no
   real recipient addresses.
