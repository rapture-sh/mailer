# @rapture-sh/mailer

## 0.1.1

### Patch Changes

- 4399168: Four things the first real consumer ran into.
  
  `createMailer` no longer insists on a default sender that nothing needs. A registry whose
  every letter names its own `from` is complete, so the default is required only by a letter
  that names none, or by a `send` that names none, which is refused at the call rather than
  at startup.
  
  `sendTemplate` no longer drops a `replyTo` passed per send. It read only the letter's own,
  so a caller could set one on a typed argument, compile, send, and have the header left off
  in silence. A reply-to passed per send now wins over the letter's own, and the letter's is
  used when the call passes none.
  
  A subject written as a copy key now types every field it names as required. A field the
  body asks for only inside a block helper is inferred optional, and keeping that inference
  handed `t()` a `string | undefined` where a copy value is a `string | number`: the build
  reported success and wrote a generated module the consumer's compiler then refused.
  
  Each letter's `sample` now reaches the registry, typed as exactly the fields that letter
  renders, so `sendTemplate(name, { fields: letters.booking.sample })` compiles and a caller
  can render every letter it has without writing the field values out a second time.

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
