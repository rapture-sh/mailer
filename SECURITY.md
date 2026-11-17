# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for a security problem.

Report it privately through GitHub:
[Security → Report a vulnerability](https://github.com/rapturedotsh/mailer/security/advisories/new).

Include what you found, how to reproduce it, and what an attacker could do with it.
Expect an acknowledgement within a few days.

## Read this first

This package holds two things worth attacking: a provider API key, and the addresses and
message bodies passing through it. It holds them only in memory, for the duration of a
send, and it is a library, so it inherits the trust boundary of whatever imports it.

What it promises:

- An API key is passed to the provider SDK and never put anywhere else. It is not logged,
  not included in a `MailError`, and not attached to an `Unknown` error payload.
- A `MailError` carries enough to act on and nothing more. Provider payloads kept for
  diagnosis are stripped of credentials first.
- Nothing is written to disk and nothing is cached between sends. The `memory` provider
  keeps messages in an array by design, for tests, and that array is reachable by anything
  that can reach the provider instance.

## What does count

- **Credential leakage.** An API key reaching a log line, a thrown error, a serialised
  `MailError`, or a provider payload retained on an `Unknown`.
- **Header injection through a template field.** A subject line is built from caller
  fields, and a field containing `\r\n` must never become a new mail header. Same for any
  address or reply-to that a caller can influence.
- **Recipient leakage across sends.** A send seeing another send's recipients, fields or
  rendered body, including through a shared or memoised provider instance under
  concurrency.
- **Mail reaching an unintended host.** The guard on a non-default `baseUrl` exists so a
  production deploy cannot post mail at a mock or at an attacker-chosen endpoint. A way
  around that guard is a vulnerability, not a configuration detail.
- **Unbounded resource consumption from one small input.** A template field or a provider
  response that makes the process allocate without limit or spin forever. Sending a large
  attachment is working as intended; a short field that does it is not.
- **Supply chain.** A dependency that exfiltrates data or runs unexpected code. This
  package has no runtime dependencies, which is part of why.

## What does not

These are documented behaviour, and reports about them will be closed:

- **A template does not escape HTML for you.** `render` returns strings and the caller
  owns them. Interpolating untrusted input into `html` is an injection in your template,
  not in this library. Build the string safely or hand `render` a function that does.
- **The `memory` provider retains everything it was sent.** That is its whole job. Do not
  configure it in production.
- **A non-default `baseUrl` sends your mail wherever you pointed it,** outside production.
  That is the local development path, and the guard is what keeps it out of production.
- **No signing, no encryption, no DKIM or SPF handling.** Those belong to your provider
  and your DNS, not to a send surface.
- **The result union is not a delivery guarantee.** `{ ok: true }` means the provider
  accepted the message, and nothing about what happens after.

## Supported versions

The latest published version on npm and `main` are supported. There are no backported
fixes to older majors.

Published tarballs carry [npm provenance](https://docs.npmjs.com/generating-provenance-statements),
so you can verify which commit and which workflow built the version you installed.
