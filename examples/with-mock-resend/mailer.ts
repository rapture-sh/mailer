import { createMailer, type LetterBuilder } from "@rapture-sh/mailer";
import { provider, senders } from "./provider";

export type Sender = keyof typeof senders;

export const mailer = createMailer({
  provider,
  senders,
  from: "notifications",
  templates: ({ letter }: LetterBuilder<Sender>) => ({
    "magic-code": letter<{ code: string }>({
      from: "auth",
      subject: (fields) => `Your code is ${fields.code}`,
      body: (fields) => ({
        text: `Your code is ${fields.code}.`,
        html: `<p>Your code is <strong>${fields.code}</strong>.</p>`,
      }),
    }),

    receipt: letter<{ reference: string; total: string }>({
      subject: (fields) => `Receipt ${fields.reference}`,
      body: (fields) => ({
        text: `Thank you. ${fields.total} paid, reference ${fields.reference}.`,
        html: `<p>Thank you. <strong>${fields.total}</strong> paid.</p>`,
      }),
    }),
  }),
});

export const reader = { email: "ada@example.com", name: "Ada" };
