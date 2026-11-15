import type { LetterBuilder } from "@rapture-sh/mailer";

/**
 * Every address this example may send from. A letter names one of these keys, never an
 * address, so a typo is a compile error rather than mail from a mailbox that does not
 * exist.
 */
export const senders = {
  auth: "Acme <auth@example.com>",
  notifications: "Acme <notifications@example.com>",
};

export type Sender = keyof typeof senders;

/**
 * The registry, written once and used by both scripts here, which is the point: the same
 * letters go out through the memory provider offline and through Resend in production.
 *
 * Each letter states its fields as a type argument. That is the only type written by hand;
 * the sender key, the subject and the field names at every call site come from here.
 */
export const letters = ({ letter, internal }: LetterBuilder<Sender>) => ({
  "magic-code": letter<{ code: string }>({
    from: "auth",
    subject: (fields) => `Your code is ${fields.code}`,
    body: (fields, { reader }) => ({
      text: [
        `Hi ${reader.name ?? "there"},`,
        "",
        "Enter this code to finish signing in. It expires in 10 minutes.",
        "",
        fields.code,
      ].join("\n"),
      html: `<p>Hi ${reader.name ?? "there"},</p><p>Your code is <b>${fields.code}</b>.</p>`,
    }),
  }),

  welcome: letter({
    subject: "Welcome to Acme",
    body: (_fields, { reader }) => ({
      text: `Hi ${reader.name ?? "there"}, welcome to Acme.`,
    }),
  }),

  "booking-confirmation": letter<{
    activityName: string;
    startsAt: Date;
    timezone: string;
    totalMinor: number;
    currency: string;
    tickets: readonly string[];
  }>({
    subject: (fields) => `Your booking for ${fields.activityName} is confirmed`,
    body: (fields) => ({
      text: [
        `Your booking for ${fields.activityName} is confirmed.`,
        // Formatting is a call made here, where the zone and the currency are visible.
        // The activity's own zone, not the reader's: a guest abroad still turns up at ten.
        new Intl.DateTimeFormat("en-GB", {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: fields.timezone,
        }).format(fields.startsAt),
        new Intl.ListFormat("en-GB", { style: "long", type: "conjunction" }).format(fields.tickets),
        `You paid ${new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: fields.currency,
        }).format(fields.totalMinor / 100)}.`,
      ].join("\n"),
    }),
  }),

  // An internal letter: it names the inbox it lands in, so no caller has to supply a
  // reader and passing one is an override rather than a requirement.
  feedback: internal<{ note: string; from: string }>({
    inbox: "feedback@example.com",
    subject: "New feedback",
    replyTo: (fields) => fields.from,
    body: (fields) => ({ text: fields.note }),
  }),
});
