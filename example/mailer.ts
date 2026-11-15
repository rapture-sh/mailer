import type { LetterBuilder } from "@rapture-sh/mailer";
import { templates } from "./generated/templates";

/**
 * Every address this example may send from. A letter's header names one of these keys,
 * never an address, and the build checks it.
 */
export const senders = {
  auth: "Acme <auth@example.com>",
  notifications: "Acme <notifications@example.com>",
};

export type Sender = keyof typeof senders;

const generated = templates();

/**
 * The registry, written once and used by both scripts here, which is the point: the same
 * letters go out through the memory provider offline and through Resend in production.
 *
 * It is handed to `createMailer` rather than wrapped in a helper, because the locale and
 * capability types flow out of that call and a generic wrapper around it would lose them.
 */
export const registry = ({ letter }: LetterBuilder<Sender>) => ({
  copy: generated.copy,
  letters: {
    ...generated.letters,

    // The escape hatch. This one is three lines of markup with no copy and no layout, so a
    // file of its own would be ceremony: a hand written letter and the generated ones
    // merge here, and both are typed the same way at the call site.
    "password-reset": letter<{ url: string }>({
      from: "auth",
      subject: "Reset your Acme password",
      body: (fields) => ({
        text: `Reset your password: ${fields.url}`,
        html: `<p><a href="${fields.url}">Reset your password</a></p>`,
      }),
    }),
  },
});

export const reader = { email: "ada@example.com", name: "Ada" };

export const booking = {
  activityName: "Kayak tour, Lake Thun",
  participants: 3,
  startsAt: new Date("2026-07-02T08:00:00.000Z"),
  // The activity's own zone, not the reader's: a guest abroad still turns up at ten.
  timezone: "Europe/Zurich",
  tickets: ["2 Adult", "1 Child"],
  totalMinor: 12_500,
  currency: "CHF",
};
