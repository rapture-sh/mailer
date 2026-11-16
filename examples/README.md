# examples

Each one is a small application that uses the package the way you would, and each shows one
thing. They run against `src/` rather than an installed build, so they are also the first
thing to break when the public surface moves.

Read them in this order if you are new to it.

| Example | What it shows | Run it |
| --- | --- | --- |
| [basic-send](basic-send/README.md) | One message, no templates, nothing generated | `pnpm example:basic` |
| [inline-templates](inline-templates/README.md) | Typed letters declared in TypeScript | `pnpm example:inline` |
| [letter-files](letter-files/README.md) | Letters as `.hbs` files, with the registry generated from them | `pnpm example:files` |
| [with-locales](with-locales/README.md) | The same letters in two languages, with `Intl` formatting | `pnpm example:locales` |
| [testing](testing/README.md) | Mail tested with no network and no API key | `pnpm example:testing` |
| [with-mock-resend](with-mock-resend/README.md) | Real HTTP at a local mock, and mail you can open | `pnpm example:mock` |

All but the last at once, since that one wants a container running:

```bash
pnpm examples
```

The two that generate a registry commit their output, and `pnpm examples:check` reports
whether it is current, which is what CI runs:

```bash
pnpm examples:build
```

## Sending for real

[with-mock-resend](with-mock-resend/README.md) is the production shape in miniature:

```ts
const provider = isProduction ? resend({ apiKey }) : mockResend();
```

Both branches are the same provider, so development, CI and the deploy run one
implementation and only the host changes. Point the first branch at a live key and it
really sends.

## Coming next

- **with-nextjs** and **with-convex**, as thin as they can be: where the mailer is built,
  where the build script runs, and what a route handler or a server function sends.
- **custom-provider**, showing how small the provider interface is, which is the most
  useful thing anyone could contribute.

Pull requests for any of these are welcome. See
[CONTRIBUTING.md](../CONTRIBUTING.md).
