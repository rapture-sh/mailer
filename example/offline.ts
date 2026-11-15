import { createMailer } from "@rapture-sh/mailer";
import { memory } from "@rapture-sh/mailer/memory";
import { booking, reader, registry, senders } from "./mailer";

/**
 * Every letter, in both locales, through the memory provider. No network, no API key, no
 * container: this is what a test suite does, and it runs anywhere.
 *
 *   pnpm example
 */
const provider = memory();

const mailer = createMailer({
  provider,
  senders,
  from: "notifications",
  templates: registry,
});

for (const locale of ["en-GB", "de-CH"] as const) {
  await mailer.sendTemplate("magic-code", {
    to: { ...reader, locale },
    fields: { code: "519204" },
    // The memory provider declares the idempotency capability, so this option exists. It
    // answers a repeated key with the first id rather than keeping a second copy.
    idempotencyKey: `magic-code:519204:${locale}`,
  });

  await mailer.sendTemplate("welcome", { to: { ...reader, locale } });

  await mailer.sendTemplate("booking-confirmation", {
    to: { ...reader, locale },
    fields: locale === "de-CH" ? { ...booking, voucherCode: "SPRING26" } : booking,
  });
}

// No reader at all: this letter's header names the inbox it lands in.
await mailer.sendTemplate("feedback", {
  fields: {
    note: "The map is slow on mobile.",
    from: "host@example.com",
    page: "https://example.com/activities/kayak",
  },
});

// A letter declared by hand rather than as a file, sent exactly like the others.
await mailer.sendTemplate("password-reset", {
  to: reader,
  fields: { url: "https://example.com/r/8fa2" },
});

// Not every message is a template. This one was rendered elsewhere and goes as it is.
await mailer.send({
  to: reader,
  subject: "Receipt REF-4182",
  text: "Thanks for your booking.",
  attachments: [
    {
      filename: "receipt.txt",
      content: new TextEncoder().encode("Acme receipt REF-4182"),
      contentType: "text/plain",
    },
  ],
});

/** The markup stripped out, so a letter reads in a terminal. */
const readable = (body: string | undefined): string =>
  (body ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&middot;/g, "-")
    .replace(/\s+/g, " ")
    .trim();

console.log(`provider: ${mailer.provider}, ${provider.sent.length} messages\n`);

for (const message of provider.sent) {
  console.log(`${message.id}  ${message.from}  ->  ${message.to.email}`);
  console.log(`  subject  ${message.subject}`);

  if (message.replyTo !== undefined) console.log(`  reply    ${message.replyTo}`);

  if (message.attachments !== undefined) {
    console.log(`  files    ${message.attachments.map((file) => file.filename).join(", ")}`);
  }

  console.log(`  body     ${readable(message.html ?? message.text).slice(0, 160)}`);
  console.log("");
}
