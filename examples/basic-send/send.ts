import { createMailer } from "@rapturedotsh/mailer";
import { memory } from "@rapturedotsh/mailer/memory";

/**
 * The smallest thing that works: one message, no templates, no types to declare.
 *
 *   pnpm example:basic
 *
 * It uses the memory provider, so it needs no API key and sends nothing. Swapping in
 * `resend({ apiKey })` changes nothing else about this file, which is the point.
 */
const provider = memory();

const mailer = createMailer({
  // Every address you may send from, by name. There is no option anywhere that takes a
  // bare address, so mail cannot go out from a mailbox you never set up.
  provider,
  senders: { hello: "Acme <hello@acme.example>" },
});

const result = await mailer.send({
  to: { email: "ada@example.com", name: "Ada" },
  subject: "Hello from Acme",
  text: "Thanks for signing up.",
  html: "<p>Thanks for signing up.</p>",
});

// A failure is a value rather than an exception, so this is a branch and not a try block.
if (result.ok) {
  console.log(`accepted as ${result.id}`);
} else {
  console.error(`${result.error.kind}: ${result.error.message}`);
}

const sent = provider.sent[0];

console.log(`\n${sent?.from} -> ${sent?.to.email}`);
console.log(`subject: ${sent?.subject}`);
console.log(`text:    ${sent?.text}`);
