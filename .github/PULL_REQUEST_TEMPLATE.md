## What this changes

<!-- One or two sentences. Link the issue if there is one. -->

## Why

<!-- What problem does it solve? For an error-mapping fix: what does the provider
actually return, and how do you know - a doc link or an observed response. -->

## Checklist

- [ ] The five type guarantees still hold, or the README says what changed and why
- [ ] Core imports no provider SDK
- [ ] No provider implements retry
- [ ] `pnpm check` passes
- [ ] New type surface has a type test that fails without the change
- [ ] Bug fixes have a regression test
- [ ] A changeset is included, if users would notice this
- [ ] Commit messages are `feat: ...` or `fix: ...`, two sentences at most

## Type tests

<!-- What the new or changed type tests assert, and which of the five guarantees they
cover. If a guarantee got weaker, say which test was removed and why. -->

## New provider or capability

<!-- Delete if none. The capability type it declares, the error kinds it maps and how
you verified the mapping, and the subpath it exports from. -->

## New peer dependencies

<!-- None, or: the package, what it does, why it is a peer rather than a dependency,
and whether it is optional. -->
