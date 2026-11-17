# Provider builder

**When to use:** Use when adding a provider, adding a capability to an existing provider,
or reworking one whose error mapping or option types are wrong. Covers the capability
type, the error mapping, the exports map and the type tests that have to come with it.

You build providers for `@rapturedotsh/mailer`. Read `AGENTS.md` first, then
`src/providers/memory.ts` for the smallest complete provider and `src/providers/resend.ts`
for one that talks to an API. Match their shape.

A provider is one mapping, in one file: `MailMessage` in, `MailResult` out, one attempt.
It declares what it can do as a type. It knows nothing about the template registry, and
core knows nothing about it.

## Order of work

1. **Read the provider's API docs for sending and for its error responses.** Both. The
   error reference is the part that matters here and the part people skip. A provider
   with a guessed error mapping looks fine in every test and makes the caller's retry
   logic useless.
2. **Capabilities.** List what this API can do that an existing capability already names,
   and what it can do that none of them do. A new capability goes in
   `src/capabilities.ts` as a type, with the option shape it unlocks beside it. Never a
   boolean on an object.
3. **The factory**, in `src/providers/<name>.ts`. It takes its own config, validates what
   it must at construction, declares its capability type, and returns a provider. One
   network attempt per `send` call. No retry, no sleeping, no logging, no `console`.
4. **The error mapping**, in that same file. Every status and error code the API can
   answer maps to a `MailError` kind:
   - `RateLimited` for 429 and anything the API calls a rate or quota limit. Carry
     `retryAfterMs` where a header or body gives it.
   - `ProviderDown` for 5xx, timeouts and transport failures.
   - `InvalidRecipient` for an address the API rejects and will keep rejecting.
   - `Suppressed` for a recipient on the provider's suppression or bounce list. Read the
     docs carefully: several APIs answer the same status for this and for an invalid
     address, and the distinction is in the body.
   - `AuthFailed` for a rejected key, 401 and 403.
   - `PayloadTooLarge` for a size limit, whether the API says 413 or 422.
   - `Unknown` only for genuinely unmapped responses. Keep the original payload with
     credentials stripped, and never put an API key in it.

   Core retries `RateLimited` and `ProviderDown` and nothing else, so a mapping mistake
   either hammers a hopeless send or gives up on a transient one.
5. **`package.json`.** Add the `exports` subpath, the SDK as an optional peer dependency
   with `peerDependenciesMeta`, and the same SDK as a dev dependency so it builds and
   tests here. Add the entry to the build config.
6. **Type tests**, in `tests/types/<name>.test-d.ts`. These are the point of the work:
   - its own options exist when it is the configured provider,
   - its options are errors when another provider is configured,
   - an option for a capability it does not declare does not compile,
   - the result is still the discriminated union and is still exhaustive.

   Negative assertions use `@ts-expect-error` with a comment saying what should have
   failed.
7. **Runtime tests**, in `tests/providers/<name>.test.ts`. Stub the fetch or the SDK
   client. One test per error kind the mapping produces, asserting the kind and not the
   message. Never the real API.
8. **README**, in the providers section, with the capabilities it declares. Then a
   changeset: minor for a new provider or capability, patch for a mapping fix.

## Do not

- Do not let core learn the provider's name. If something only works because core checks
  which provider it has, the capability type is missing.
- Do not retry, sleep, back off or batch inside a provider.
- Do not throw for a mail failure. Construction-time programmer error throws; a response
  becomes a kind.
- Do not add a dev or local provider. `mockResend()` is the `resend` provider with its base
  url preset, so development and production run the same code. A provider that only runs
  locally is the thing this package refuses to have.
- Do not widen a type to make the options fit. If the conditional type is the problem,
  fix the conditional type.

Finish with `pnpm check` green, and report which error kinds you mapped, what evidence
you had for each one, and anything the API can answer that you could not map.
