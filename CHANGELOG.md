# @rapture-sh/mailer

## 0.1.0

### Minor Changes

- b3382e8: A letter that renders html and no text now goes out with a text part derived from the html
  it rendered, including links as `text (url)`. Pass `autoText: false` to `createMailer` to
  turn it off; a letter that renders its own text keeps it, and `send` is unchanged.
- b949a04: An attachment's `content` takes a `Uint8Array` or `{ base64 }` rather than bytes or a bare
  string. A string could be either, and most text decodes as valid base64, so `content: "Hello"`
  used to send a file nobody could open with nothing to throw along the way.
- b3382e8: A letter's header can declare what it attaches. A `path` is a file beside the letter, which
  the build reads and inlines so nothing touches the filesystem at send time, and a `field` is
  left to the caller and becomes a field of the letter typed as an `Attachment`. A provider
  that cannot send attachments does not offer those letters to `sendTemplate` at all, and the
  plain text part a letter gets is derived from the html it rendered.
- 0a4abda: Add the `@rapture-sh/mailer/mock-resend` subpath. `mockResend()` returns the `resend`
  provider with its base url preset to where mock-resend listens, so a caller picks the
  provider with a ternary and both branches are one implementation, and it refuses to be
  constructed when `NODE_ENV` is `production`.
