import type { Retry, SomeProvider } from "@rapture-sh/mailer";
import { createMailer } from "@rapture-sh/mailer";

/**
 * The registry an application would export, taking its provider from the outside so a test
 * can hand it a memory one and production can hand it Resend.
 */
export const senders = {
  auth: "Acme <auth@acme.example>",
  notifications: "Acme <notifications@acme.example>",
};

export function mailerFor<TProvider extends SomeProvider>(
  provider: TProvider,
  /** A test replaces the sleep, so backoff can be driven without waiting for it. */
  retry?: Partial<Retry>,
) {
  return createMailer({
    provider,
    senders,
    from: "notifications",
    ...(retry === undefined ? {} : { retry }),
    templates: ({ letter }) => ({
      "magic-code": letter<{ code: string }>({
        from: "auth",
        subject: (fields) => `Your code is ${fields.code}`,
        body: (fields) => ({ text: `Your code is ${fields.code}.` }),
      }),
    }),
  });
}
