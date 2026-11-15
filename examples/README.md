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

All of them at once:

```bash
pnpm examples
```

The two that generate a registry commit their output, and `pnpm examples:check` reports
whether it is current, which is what CI runs:

```bash
pnpm examples:build
```

## Sending for real, and sending at a mock

[with-locales](with-locales/README.md) also holds `send-through-resend.ts`, which posts
through the real `resend` provider:

```bash
RESEND_BASE_URL=http://localhost:3000 pnpm example:resend
```

That is the production shape in miniature. The base url is read outside production and
ignored inside it, so development points at a mock and production posts to Resend, and the
provider refuses a non-default base url under `NODE_ENV=production` anyway:

```ts
const isProduction = process.env.NODE_ENV === "production";

resend({
  apiKey: process.env.RESEND_API_KEY ?? "",
  baseUrl: isProduction ? "" : (process.env.RESEND_BASE_URL ?? ""),
});
```

## Coming next

- **with-mock-resend**, once [mock-resend](https://github.com/rapture-sh/mock-resend) is
  finished: the same letters sent at a local mock of the Resend API, with a dashboard to
  open each one in. Until then, `example:resend` above shows the swap and mock-resend is
  the thing to point it at.
- **with-nextjs** and **with-convex**, as thin as they can be: where the mailer is built,
  where the build script runs, and what a route handler or a server function sends.
- **custom-provider**, showing how small the provider interface is, which is the most
  useful thing anyone could contribute.

Pull requests for any of these are welcome. See
[CONTRIBUTING.md](../CONTRIBUTING.md).
