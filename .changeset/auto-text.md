---
"@rapture-sh/mailer": minor
---

A letter that renders html and no text now goes out with a text part derived from the html
it rendered, including links as `text (url)`. Pass `autoText: false` to `createMailer` to
turn it off; a letter that renders its own text keeps it, and `send` is unchanged.
