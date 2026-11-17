import { createMailer } from "@rapturedotsh/mailer";
import { memory } from "@rapturedotsh/mailer/memory";

/**
 * Templates declared in TypeScript, which is where to start when you have a handful of
 * emails and no need for translations.
 *
 *   pnpm example:inline
 *
 * Each letter states its fields once as a type argument. That is the only type written by
 * hand here: the names, the fields at every call site and the sender keys all come from it.
 */
const provider = memory();

const mailer = createMailer({
  provider,

  senders: {
    auth: "Acme <auth@acme.example>",
    notifications: "Acme <notifications@acme.example>",
  },
  from: "notifications",

  templates: ({ letter, internal }) => ({
    "magic-code": letter<{ code: string }>({
      from: "auth",
      subject: (fields) => `Your code is ${fields.code}`,
      body: (fields, { reader }) => ({
        text: `Hi ${reader.name ?? "there"}, your code is ${fields.code}.`,
        html: `<p>Hi ${reader.name ?? "there"}, your code is <b>${fields.code}</b>.</p>`,
      }),
    }),

    receipt: letter<{ reference: string; totalMinor: number; currency: string }>({
      // The formatters are on the context, so money is formatted where you can see which
      // currency it used.
      subject: (fields) => `Receipt ${fields.reference}`,
      body: (fields, { money }) => ({
        text: `You paid ${money(fields.totalMinor, fields.currency)}.`,
      }),
    }),

    // A letter that comes to you rather than going out: it names the inbox it lands in, so
    // no caller has to address it, and a reply reaches whoever wrote it.
    feedback: internal<{ note: string; from: string }>({
      inbox: "feedback@acme.example",
      subject: "New feedback",
      replyTo: (fields) => fields.from,
      body: (fields) => ({ text: fields.note }),
    }),
  }),
});

const reader = { email: "ada@example.com", name: "Ada" };

await mailer.sendTemplate("magic-code", { to: reader, fields: { code: "519204" } });

await mailer.sendTemplate("receipt", {
  to: reader,
  fields: { reference: "REF-4182", totalMinor: 12_500, currency: "CHF" },
});

// No reader at all, because this letter's inbox is part of its declaration.
await mailer.sendTemplate("feedback", {
  fields: { note: "The map is slow on mobile.", from: "host@example.com" },
});

for (const message of provider.sent) {
  console.log(`${message.from} -> ${message.to.email}`);
  console.log(`  subject  ${message.subject}`);

  if (message.replyTo !== undefined) console.log(`  reply    ${message.replyTo}`);

  console.log(`  text     ${message.text ?? "(html only)"}`);
  console.log("");
}
