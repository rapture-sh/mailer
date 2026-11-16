---
"@rapture-sh/mailer": minor
---

A letter's header can declare what it attaches. A `path` is a file beside the letter, which
the build reads and inlines so nothing touches the filesystem at send time, and a `field` is
left to the caller and becomes a field of the letter typed as an `Attachment`. A provider
that cannot send attachments does not offer those letters to `sendTemplate` at all, and the
plain text part a letter gets is derived from the html it rendered.
