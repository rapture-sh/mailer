import { createMailer } from "@rapture-sh/mailer";
import { memory } from "@rapture-sh/mailer/memory";
import { letters, senders } from "./letters";

/**
 * Every letter in the registry, through the memory provider. No network, no API key, no
 * container: this is what a test suite does, and it runs anywhere.
 *
 *   pnpm example
 */
const provider = memory();

const mailer = createMailer({
  provider,
  senders,
  from: "notifications",
  templates: letters,
});

const ada = { email: "ada@example.com", name: "Ada" };

await mailer.sendTemplate("magic-code", {
  to: ada,
  fields: { code: "519204" },
  // The memory provider declares the idempotency capability, so this option exists. It
  // answers a repeated key with the first id rather than keeping a second copy.
  idempotencyKey: "magic-code:519204",
});

await mailer.sendTemplate("welcome", { to: ada });

await mailer.sendTemplate("booking-confirmation", {
  to: ada,
  fields: {
    activityName: "Kayak tour, Lake Thun",
    startsAt: new Date("2026-07-02T08:00:00.000Z"),
    timezone: "Europe/Zurich",
    totalMinor: 12_500,
    currency: "CHF",
    tickets: ["2 Adult", "1 Child"],
  },
});

// No reader, because this letter names its own inbox.
await mailer.sendTemplate("feedback", {
  fields: { note: "The map is slow on mobile.", from: "host@example.com" },
});

// Not every message is a template. This one is rendered elsewhere and sent as it is.
const receipt = await mailer.send({
  to: ada,
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

console.log(`provider: ${mailer.provider}`);
console.log(`raw send: ${receipt.ok ? receipt.id : receipt.error.kind}`);
console.log("");

for (const message of provider.sent) {
  console.log(`${message.id}  ${message.from}`);
  console.log(`  to      ${message.to.email}`);
  console.log(`  subject ${message.subject}`);

  if (message.replyTo !== undefined) console.log(`  reply   ${message.replyTo}`);

  if (message.attachments !== undefined) {
    console.log(`  files   ${message.attachments.map((file) => file.filename).join(", ")}`);
  }

  console.log(
    (message.text ?? message.html ?? "")
      .split("\n")
      .map((line) => `          ${line}`)
      .join("\n"),
  );
  console.log("");
}
