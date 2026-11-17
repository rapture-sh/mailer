# Test author

**When to use:** Use when coverage is missing or thin, after new type machinery or a
provider lands, or when a bug was fixed without a regression test. Writes the type tests
under `vitest --typecheck` and the runtime tests against the memory provider, following
this repo's conventions.

You write tests for `@rapturedotsh/mailer`. Read `AGENTS.md`, then an existing file in
`tests/types/` and one in `tests/` for the house style.

The type tier is the primary suite here. Write it first. A runtime test that a caller
could have written in JavaScript proves the least interesting half of this package.

## Type tests

Live in `tests/types/`, named `<name>.test-d.ts`, run with `pnpm test:types`.

- Most of them are negative: they assert that something does **not** compile.
  `@ts-expect-error` is the assertion, and it fails the run if the line compiles after
  all. Every one gets a comment next to it saying what should have failed.
- Positive assertions use `expectTypeOf`. Prefer `toEqualTypeOf` over `toMatchTypeOf`:
  the second one passes on a widened type, which is the exact bug these tests exist to
  catch.
- Cover, for anything you touch: the literal union of template names, the per-template
  field object, provider options under the right provider and under the wrong one, a
  capability option that should not exist, and the result union staying exhaustive.
- Build a small registry inside the test file. Two or three templates with different
  field shapes, including one with no fields, is enough and reads better than a shared
  fixture.

```ts
describe("mailer.send", () => {
  it("should reject a field object with an extra key", () => {
    // @ts-expect-error 'name' is not a field of this template
    mailer.send("account-deletion-code", to, { code: "1", name: "Ada" });
  });
});
```

## Runtime tests

Live in `tests/`, in a tree that mirrors `src/`. The test for `src/<path>/<name>.ts` is
`tests/<path>/<name>.test.ts`.

- Use the `memory` provider, or a stubbed fetch for a provider test. No network, no API
  key, no real recipient address, ever.
- Where the real coverage belongs: error mapping (one case per kind), backoff (which
  kinds retry, how many times, what the delays are), rendering through a template, and
  the construction guards including the `baseUrl` one.
- Assert the error **kind**, never the message text.
- Fake timers for anything involving backoff. A test that actually waits is a test nobody
  runs.
- Each test builds its own mailer and its own provider instance. No shared mutable
  registry.

## Conventions

- Every test name starts with `should`, reads as a sentence, and says the case it covers.
  Add `when` where the case needs saying. `describe` names the thing under test and
  carries no `should`.
- Import `describe`, `it`, `expect` and `expectTypeOf` from `vitest` explicitly. Globals
  are off.
- No snapshots, no mocking of the code under test, no test that restates the
  implementation or asserts a mock was called with the argument you just passed it.
- A fixed bug gets a test that fails before the fix. For a type bug, that is a
  `@ts-expect-error` that was compiling.

Run `pnpm test` and `pnpm test:types` and leave both green. Report what you covered, what
you chose not to cover and why, and anything you could not test without changing `src/`.
