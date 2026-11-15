import { createMailer } from "@rapture-sh/mailer";
import { resend } from "@rapture-sh/mailer/resend";
import { letters, senders } from "./letters";

/**
 * The same registry through the real `resend` provider, pointed at mock-resend.
 *
 *   RESEND_BASE_URL=http://localhost:<port> pnpm example:mock
 *
 * This is the whole reason there is no dev provider in this package: development and CI
 * run the provider code that production runs, over the same wire format, and only the host
 * changes. Point it at nothing and you have no coverage of the code that matters.
 *
 * The guard in the provider refuses a non-default base url when NODE_ENV is production, so
 * this arrangement cannot be shipped by accident.
 */
const baseUrl = process.env.RESEND_BASE_URL;

if (baseUrl === undefined || baseUrl === "") {
  console.error(
    [
      "Set RESEND_BASE_URL to wherever mock-resend is listening, for example:",
      "",
      "  RESEND_BASE_URL=http://localhost:3000 pnpm example:mock",
      "",
      "mock-resend is at https://github.com/rapture-sh/mock-resend. To send through the",
      "real API instead, set RESEND_BASE_URL to https://api.resend.com and give",
      "RESEND_API_KEY a live key.",
    ].join("\n"),
  );

  process.exit(1);
}

const mailer = createMailer({
  provider: resend({
    // mock-resend has nothing to authenticate, so any string will do against it.
    apiKey: process.env.RESEND_API_KEY ?? "re_local",
    baseUrl,
  }),
  senders,
  from: "notifications",
  templates: letters,
});

const result = await mailer.sendTemplate("magic-code", {
  to: { email: "ada@example.com", name: "Ada" },
  fields: { code: "519204" },
  idempotencyKey: `magic-code:${Date.now()}`,
  // Resend declares the schedule capability, so this option exists here and would be a
  // compile error on the memory provider.
  sendAt: new Date(Date.now() + 60_000),
  tags: [{ name: "letter", value: "magic-code" }],
});

if (result.ok) {
  console.log(`accepted as ${result.id}`);
} else {
  console.error(`${result.error.kind}: ${result.error.message}`);

  // The kind is the contract, so this is what retry logic branches on.
  if (result.error.kind === "RateLimited") {
    console.error(`retry after ${result.error.retryAfterMs ?? "a backoff of our own"}`);
  }

  process.exit(1);
}
