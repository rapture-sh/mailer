---
"@rapture-sh/mailer": minor
---

An attachment's `content` takes a `Uint8Array` or `{ base64 }` rather than bytes or a bare
string. A string could be either, and most text decodes as valid base64, so `content: "Hello"`
used to send a file nobody could open with nothing to throw along the way.
