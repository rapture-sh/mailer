import { createMailer } from "@rapture-sh/mailer";
import { memory } from "@rapture-sh/mailer/memory";
import { templates } from "./generated/templates";

/**
 * The same idea as the inline example, except the letters are files and the registry is
 * generated from them. No type is written per letter: the fields below came off the markup.
 *
 *   pnpm example:files:build     reads emails/ and writes generated/
 *   pnpm example:files           sends every letter through the memory provider
 */
const provider = memory();

const mailer = createMailer({
  provider,
  senders: {
    auth: "Acme <auth@acme.example>",
    notifications: "Acme <notifications@acme.example>",
  },
  from: "notifications",
  templates,
});

const reader = { email: "ada@example.com", name: "Ada" };

await mailer.sendTemplate("magic-code", { to: reader, fields: { code: "519204" } });

await mailer.sendTemplate("receipt", {
  to: reader,
  fields: {
    reference: "REF-4182",
    // Required because receipt.hbs declares it as an attachment the caller passes. Leave
    // it out and this stops compiling.
    invoice: {
      filename: "invoice.pdf",
      content: new TextEncoder().encode("Acme invoice REF-4182"),
      contentType: "application/pdf",
    },
    activityName: "Kayak tour, Lake Thun",
    participants: 3,
    startsAt: new Date("2026-07-02T08:00:00.000Z"),
    // The activity's own zone, not the reader's: a guest abroad still turns up at ten.
    timezone: "Europe/Zurich",
    tickets: ["2 Adult", "1 Child"],
    totalMinor: 12_500,
    currency: "CHF",
    // Optional, because the markup only mentions it inside an `{{#if}}`.
    voucherCode: "SPRING26",
  },
});

for (const message of provider.sent) {
  const files = message.attachments ?? [];

  console.log(`${message.from} -> ${message.to.email}`);
  console.log(`  subject  ${message.subject}`);
  // Neither letter declares a text body. This is the one the mailer derived from the
  // html, which is what a reader on a client that shows no markup gets.
  const text = (message.text ?? "").replaceAll("\n\n", "\n").replaceAll("\n", " / ");

  console.log(`  text     ${text.slice(0, 140)}`);

  if (files.length > 0) {
    console.log(`  files    ${files.map((file) => file.filename).join(", ")}`);
  }

  console.log("");
}
