import type { MailMessage } from "../message";
import type { NoOptions, Provider } from "../provider";
import type { MailError } from "../result";

export type MemoryCapability = "attachments" | "idempotency" | "replyTo" | "headers";

export type SentMessage = MailMessage & { readonly id: string };

export type MemoryProvider = Provider<MemoryCapability, NoOptions> & {
  /** Every message this provider accepted, oldest first. */
  readonly sent: readonly SentMessage[];
  clear(): void;
  /**
   * Answer the next sends with these errors instead of accepting them. Queued in order,
   * so one call can drive a whole backoff sequence without a network or a clock.
   */
  failNext(...errors: readonly MailError[]): void;
};

export function memory(): MemoryProvider {
  const sent: SentMessage[] = [];
  const idsByKey = new Map<string, string>();
  const failures: MailError[] = [];
  let count = 0;

  return {
    name: "memory",
    capabilities: ["attachments", "idempotency", "replyTo", "headers"],

    get sent() {
      return sent;
    },

    clear() {
      sent.length = 0;
      failures.length = 0;
      idsByKey.clear();
    },

    failNext(...errors) {
      failures.push(...errors);
    },

    send(message) {
      const failure = failures.shift();

      if (failure !== undefined) return Promise.resolve({ ok: false, error: failure });

      // Resend answers a repeated idempotency key with the id it gave the first time
      // rather than putting a second copy in the inbox. Retry safety is only testable if
      // this provider does the same.
      const key = message.idempotencyKey;

      if (key !== undefined) {
        const first = idsByKey.get(key);

        if (first !== undefined) return Promise.resolve({ ok: true, id: first });
      }

      count += 1;

      const id = `memory-${count}`;

      sent.push({ ...message, id });

      if (key !== undefined) idsByKey.set(key, id);

      return Promise.resolve({ ok: true, id });
    },
  };
}
