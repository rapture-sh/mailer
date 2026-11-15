---
description: Run the full local check suite
---

Run this and report what fails, with the relevant output:

```bash
pnpm check
```

If you need a shorter loop, the parts are `pnpm lint`, `pnpm typecheck`, `pnpm test`,
`pnpm test:types`, `pnpm build` and `pnpm check:exports`.

Fix anything mechanical (formatting, imports, obvious type errors) yourself. For a real
failure, explain the cause before changing behaviour, and never silence a type error with
a cast: `any`, `as` and `@ts-expect-error` are not allowed in `src/`.
