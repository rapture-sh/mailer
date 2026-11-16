# with-mock-resend

Real HTTP, the real provider, and mail you can open, with nothing leaving your machine.
This is the production shape in miniature: the only difference between this and a deploy is
which host the provider posts to.

```
provider.ts            the ternary. the one thing to copy out of here.
mailer.ts              two letters, declared inline, because this example is about sending
send.ts                one letter, and one with an attachment
simulate-failures.ts   rate limits and backoff, driven on purpose
docker-compose.yml     mock-resend, on the port its image publishes
```

## Run it

```bash
docker compose -f examples/with-mock-resend/docker-compose.yml up -d
```

```bash
pnpm example:mock
```

It prints the id of each accepted message and a link to the console, where every letter is
there to read with its attachment on it. Then:

```bash
pnpm example:mock:faults
```

To stop it, and to throw away the mail it kept:

```bash
docker compose -f examples/with-mock-resend/docker-compose.yml down -v
```

## The one thing to copy

```ts
const provider = isProduction
  ? resend({ apiKey: process.env.RESEND_API_KEY ?? "" })
  : mockResend();
```

`mockResend()` is not a second provider. It is the `resend` provider with its base url
preset to where [mock-resend](https://github.com/rapture-sh/mock-resend) listens, so both
branches of that ternary are the same `ResendProvider` and your development, your CI and
your deploy all run the one implementation: the same wire format, the same error mapping,
the same backoff, the same capability types at the call site.

That is also why this package ships no dev provider and should never grow one. A provider
written for development is a second code path that merely resembles the real one, and the
day it diverges you find out because somebody did not get their receipt.

Two guards make the arrangement safe to have in a repository:

- `mockResend()` throws at construction when `NODE_ENV` is `production`.
- `resend()` refuses a non-default `baseUrl` when `NODE_ENV` is `production`.

A deploy that posts real mail into a mock sends nothing, logs nothing and looks perfectly
healthy, so both of these fail loudly instead.

## Driving the failures

`simulate-failures.ts` asks mock-resend to fail the next send, through its admin API:

```bash
curl -X POST http://localhost:9100/_admin/faults \
  -H "Content-Type: application/json" \
  -d '{"api_key":"re_test","error":"rate_limit_exceeded","target":"send","times":1}'
```

mock-resend only accepts error names Resend actually serves, so what comes back is the body
the live API would send and the mapping being exercised is the one production uses. The
script does it twice:

- **One rate limit**, which backoff rides out. `RateLimited` is transient, so the mailer
  retries and the caller gets the send that worked.
- **Five**, which is more than there are attempts, so the kind reaches the caller and the
  `retryAfterMs` field exists on that branch of the union and nowhere else.

It clears its fault rules at both ends, because a rule outlives the process and would
otherwise rate limit whatever sent next.

## The package's own integration tests

The same idea, as a suite rather than a script:

```bash
docker run --rm -p 9100:9100 raptureoss/mock-resend
```

```bash
pnpm test:integration
```

It sends every kind of message this package can produce at the container and reads each one
back: letters in several locales, attachments with their decoded sizes, idempotency,
scheduling, and every error mock-resend will inject against the kind it has to become. It
skips itself when nothing is listening, so `pnpm test` never needs a container.

## Notes

- **The key is an inbox, not a credential.** mock-resend takes any key beginning `re_` and
  keeps each one's mail separately. `mockResend()` defaults to `re_test`; pass `apiKey` to
  separate one service's mail from another's.
- **Somewhere other than localhost?** Pass `url`, or set `MOCK_RESEND_URL`. Inside a compose
  network that is the service name, so `http://email:9100`.
- **The compose file publishes 9100 only.** mock-resend also speaks SMTP on 1025, which this
  example never uses: the mailer posts over HTTP. The line is there, commented, for a stack
  that needs it.
- **Mail is kept in a volume**, so it survives a restart. `down -v` is what empties it.
