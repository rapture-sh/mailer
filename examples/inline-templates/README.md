# inline-templates

Templates declared in TypeScript. Where to start when you have a handful of emails and no
need for translations.

```bash
pnpm example:inline
```

What it shows:

- `letter<{ code: string }>` is the only type written by hand. From there the template name
  and the field object are both checked by the compiler.
- A letter names its own sender with `from: "auth"`, as a key of `senders`.
- `internal(...)` declares a letter that comes *to* you: it names the inbox it lands in, so
  no caller addresses it, and `replyTo` reads a reply address out of its fields.
- The formatters are on the render context, so `money(totalMinor, currency)` happens where
  you can see which currency it used.

Try breaking it. Rename a field, misspell a template name, or change `from: "auth"` to
`from: "atuh"`: none of it compiles.

Next: [letter-files](../letter-files/README.md), once markup inside TypeScript gets old.
