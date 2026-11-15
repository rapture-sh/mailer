import { createMailer } from "@rapture-sh/mailer";
import { resend } from "@rapture-sh/mailer/resend";
import { reader, registry, senders } from "./mailer";

/**
 * The same letters through the real `resend` provider, pointed at mock-resend.
 *
 *   RESEND_BASE_URL=http://localhost:<port> pnpm example:resend
 *
 * This is the whole reason the package ships no dev provider: development and CI run the
 * provider code that production runs, over the same wire format, and only the host
 * changes. Point it at nothing and you have no coverage of the code that matters.
 */
/**
 * The production shape of this: the base url is read outside production and ignored in it.
 * Development points at mock-resend, production posts to Resend, and the provider refuses
 * a non-default base url under NODE_ENV=production anyway, so a deploy cannot send mail
 * into a mock by accident.
 */
const isProduction = process.env.NODE_ENV === "production";
const baseUrl = isProduction ? "" : (process.env.RESEND_BASE_URL ?? "");

if (baseUrl === "" && !isProduction) {
  console.error(
    [
      "Set RESEND_BASE_URL to wherever mock-resend is listening, for example:",
      "",
      "  RESEND_BASE_URL=http://localhost:3000 pnpm example:resend",
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
    // Empty in production, which is the provider's default, so nothing is overridden.
    baseUrl,
  }),
  senders,
  from: "notifications",
  templates: registry,
});

const result = await mailer.sendTemplate("magic-code", {
  to: { ...reader, locale: "de-CH" },
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
