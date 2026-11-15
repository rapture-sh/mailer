# basic-send

One message, no templates, nothing generated. Start here.

```bash
pnpm example:basic
```

It uses the `memory` provider, so it needs no API key and sends nothing anywhere. Swap in
`resend({ apiKey })` and the rest of the file is unchanged, which is the whole trick.

What it shows:

- `senders` is the list of addresses you may send from, by name. No option anywhere takes a
  bare address, so mail cannot go out from a mailbox you never set up.
- The result is a value, not an exception. A failure is a branch on `result.ok` and then on
  `result.error.kind`.
- The memory provider records the whole message, so a test can assert on it.

Next: [inline-templates](../inline-templates/README.md), once writing HTML at the call site
stops being pleasant.
