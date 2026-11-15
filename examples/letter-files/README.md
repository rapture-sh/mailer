# letter-files

Letters as handlebars files, with the registry generated from them. No type is written per
letter.

```bash
pnpm example:files:build
```

```bash
pnpm example:files
```

```
emails/            one file per letter, plus the layout they share
build-emails.ts    the build script. in your own repo: scripts/build-emails.mjs
generated/         what the build writes. committed, typechecked, never edited.
send.ts            sends both letters through the memory provider
```

What it shows:

- **The fields come off the markup.** `emails/receipt.hbs` never declares `activityName`,
  `startsAt`, `tickets` or `voucherCode`. `{{ activityName }}` makes it a string,
  `{{ dateTime startsAt zone=timezone }}` makes `startsAt` a `number | Date` and
  `timezone` a string, `{{ list tickets }}` makes it a list of strings, and
  `{{#if voucherCode}}` makes that one optional. Only `participants: number` is declared,
  because nothing in the markup says it is a number rather than a string.
- **A file with a header is a letter, a file without one is a partial.** That is how
  `layout.hbs` is recognised without being configured anywhere.
- **The build writes two files.** `templates.ts` is the typed registry your compiler
  checks; `templates.bodies.ts` is what handlebars' precompiler emits, which is
  unannotated JavaScript carrying a `@ts-nocheck` and nothing else. They are separate so
  that one suppression cannot cover the types.
- **The sender is checked twice.** `build-emails.ts` passes the senders a `from:` may name,
  so the build fails with a file and a line, and the generated type carries
  `from: "auth"`, so a mailer whose `senders` lack it fails to compile.
- `--check` writes nothing and reports whether the committed output is current. That is
  what belongs in CI.

Next: [with-locales](../with-locales/README.md), for the same letters in several languages.
