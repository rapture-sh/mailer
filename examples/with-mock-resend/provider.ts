import { mockResend } from "@rapture-sh/mailer/mock-resend";
import { resend } from "@rapture-sh/mailer/resend";

/**
 * The one thing to copy out of this example.
 *
 * Production posts to Resend, everything else posts to mock-resend, and both branches are
 * the same provider underneath, so the code that renders, maps errors and backs off is the
 * code that runs for real. `mockResend` refuses to be constructed under NODE_ENV=production
 * on top of that, so this cannot be deployed pointing at a mock.
 */
const isProduction = process.env.NODE_ENV === "production";

/** Inside a compose network the host is the service name rather than localhost. */
const url = process.env.MOCK_RESEND_URL;

export const provider = isProduction
  ? resend({ apiKey: process.env.RESEND_API_KEY ?? "" })
  : mockResend(url === undefined ? {} : { url });

export const senders = {
  auth: "Acme <auth@example.com>",
  notifications: "Acme <notifications@example.com>",
};
