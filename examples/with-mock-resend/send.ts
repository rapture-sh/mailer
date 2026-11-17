import type { MailResult } from "@rapturedotsh/mailer";
import { mockResendConsole } from "@rapturedotsh/mailer/mock-resend";
import { mailer, reader } from "./mailer";

/**
 * Two letters, one with an attachment, at a local mock-resend.
 *
 *   docker compose -f examples/with-mock-resend/docker-compose.yml up -d
 *   pnpm example:mock
 */
function report(letter: string, result: MailResult): void {
  if (result.ok) {
    console.log(`${letter}: accepted as ${result.id}`);

    return;
  }

  console.error(`${letter}: ${result.error.kind}: ${result.error.message}`);

  if (result.error.kind === "ProviderDown") {
    console.error("Is mock-resend running? See examples/with-mock-resend/README.md.");
  }

  process.exitCode = 1;
}

report(
  "magic-code",
  await mailer.sendTemplate("magic-code", {
    to: reader,
    fields: { code: "519204" },
    // A retried job sends one message rather than a second code.
    idempotencyKey: `magic-code:${reader.email}:${Date.now()}`,
    tags: [{ name: "letter", value: "magic-code" }],
  }),
);

report(
  "receipt",
  await mailer.sendTemplate("receipt", {
    to: reader,
    fields: { reference: "REF-4182", total: "CHF 125.00" },
    // Attachments go over the wire as base64 and come back out of the console as a file,
    // which is the part no unit test can show you.
    attachments: [
      {
        filename: "receipt.txt",
        content: new TextEncoder().encode("Acme\nREF-4182\nCHF 125.00\n"),
        contentType: "text/plain",
      },
    ],
  }),
);

console.log(`\nOpen them at ${mockResendConsole(process.env.MOCK_RESEND_URL)}`);
