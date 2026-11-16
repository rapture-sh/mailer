---
"@rapture-sh/mailer": patch
---

Four things the first real consumer ran into.

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
