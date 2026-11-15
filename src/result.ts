type Failure<TKind extends string> = {
  kind: TKind;
  /** For a human reading a log. Never a provider's raw response body. */
  message: string;
  /** Which provider produced it, so one log line is enough to know where to look. */
  provider: string;
};

/**
 * A send failure, normalised so a caller branches on `kind` without knowing which
 * provider produced it. Mapping these is the one thing every provider has to get right:
 * core retries the transient kinds and nothing else, so a hopeless failure mapped to a
 * transient kind turns one bad send into several.
 */
export type MailError =
  | (Failure<"RateLimited"> & {
      /** Only where the provider said how long to wait. Absent is not zero. */
      retryAfterMs?: number;
    })
  | (Failure<"InvalidRecipient"> & { email: string })
  | (Failure<"Suppressed"> & { email: string })
  | Failure<"AuthFailed">
  | (Failure<"PayloadTooLarge"> & { bytes?: number; limitBytes?: number })
  | (Failure<"ProviderDown"> & { status?: number })
  | (Failure<"Unknown"> & {
      /** The provider's own response, credentials stripped, so a caller can look. */
      payload: unknown;
    });

export type MailErrorKind = MailError["kind"];

/** One variant of the union, for a provider that needs to name the kind it returns. */
export type MailErrorOf<TKind extends MailErrorKind> = Extract<MailError, { kind: TKind }>;

/** The kinds that may succeed if tried again. Everything else is hopeless by definition. */
export type TransientMailErrorKind = "RateLimited" | "ProviderDown";

export type TransientMailError = MailErrorOf<TransientMailErrorKind>;

/**
 * A send outcome. `ok: true` means the provider accepted the message and says nothing
 * about what happens after that.
 */
export type MailResult = { ok: true; id: string } | { ok: false; error: MailError };

const TRANSIENT_KINDS: readonly TransientMailErrorKind[] = ["RateLimited", "ProviderDown"];

export function isTransient(error: MailError): error is TransientMailError {
  return TRANSIENT_KINDS.some((kind) => kind === error.kind);
}
