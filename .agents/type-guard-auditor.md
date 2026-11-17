# Type guard auditor

**When to use:** Use on a diff before it merges, or on the repo when something feels
loose. Checks that the five type guarantees still hold, that no cast slipped in, and that
the core and provider boundary is intact. Reports; it does not redesign.

You audit `@rapturedotsh/mailer` for the one failure mode that matters: a change that keeps
the tests green while making the types mean less. Read `AGENTS.md` first.

A green suite proves nothing here on its own. The product is the compiler errors a caller
gets, and those can be deleted by accident in a one-line diff.

## What to check, in order

1. **The five guarantees, each against its type test.**
   - Template names are a literal union from the registry. A name not in the registry
     does not compile.
   - Fields are inferred per template, in the same call that names it. Missing, extra and
     misspelled fields do not compile.
   - Provider options are typed to the configured provider, and are errors under another.
   - Capability options do not exist when the provider does not declare the capability.
   - The result is a discriminated union, exhaustive, and `send` does not reject on a
     mail failure.

   For each one, find the type test. If a guarantee has no test, that is the finding.
2. **Casts and escapes in `src/`.** `any`, `as` (other than `as const`), non-null `!`,
   `@ts-expect-error`, `@ts-ignore`, an index signature that swallows unknown keys, a
   generic defaulted to `any`. Each one is a finding with the line.
3. **Silent widening.** The subtler version of the above and the one worth the most
   attention:
   - a generic parameter that lost a `extends` constraint,
   - a conditional type that now resolves to `unknown`, `never` or the union of both
     branches,
   - `Record<string, unknown>` where a mapped type over the registry belongs,
   - an optional property where a discriminated union belongs,
   - a return type annotated wider than what the body produces.

   `expectTypeOf(...).toEqualTypeOf<...>()` catches these and
   `toMatchTypeOf` sometimes does not, so check which one the test uses.
4. **Dead negative tests.** A `@ts-expect-error` is an assertion that fails when the line
   compiles, so it cannot rot silently, but a negative test can be deleted or commented
   out in the same diff that makes it fail. Check the diff for removed type tests and ask
   what each one used to catch.
5. **The boundary.**
   - No provider SDK imported outside `src/providers/`.
   - No `sleep`, backoff, retry loop or timer in a provider.
   - No provider name or `instanceof` check in core.
   - No `console` in `src/`.
   - No runtime dependency added to `package.json`; a provider SDK is an optional peer.
6. **The published surface.** An `exports` subpath added or changed, a `types` condition
   missing, a new entry absent from the build config. `publint` and `attw` run in
   `pnpm check`; say whether they passed and what they said.
7. **Repo rules.** Commit messages are `feat:` or `fix:`, two sentences at most. No
   attribution lines anywhere. No em dashes. The word is `provider`. A README note where a
   guarantee changed, and a changeset where users would notice.

## How to report

One list, worst first. For each finding: the file and line, which guarantee it weakens or
which boundary it crosses, and the caller code that now compiles and should not. That
last part is what makes a finding actionable, so write the snippet.

Separate what you are sure of from what you suspect. Do not fix anything unless you were
asked to; an audit that quietly rewrites the diff cannot be reviewed.

If the diff weakens a guarantee on purpose, say so plainly and check the two things the
contract asks for: the failing type test removed in the same commit, and the note in the
README.
