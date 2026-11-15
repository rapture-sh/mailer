import type { Capability } from "./capabilities";
import type { MailMessage } from "./message";
import type { MailResult } from "./result";

/** A provider with no options of its own. */
export type NoOptions = Record<never, never>;

/**
 * One backend, one attempt.
 *
 * A provider maps `MailMessage` in to `MailResult` out and returns. It never retries, never
 * sleeps and never logs: backoff lives in core and reads the error kind, so retry behaviour
 * is one implementation that every provider inherits.
 */
export type Provider<
  TCapabilities extends Capability = never,
  TOptions extends object = NoOptions,
> = {
  readonly name: string;
  readonly capabilities: readonly TCapabilities[];
  /** The largest message the API accepts, where it says, so core can refuse early. */
  readonly maxBytes?: number;
  send(message: MailMessage, options: TOptions): Promise<MailResult>;
};

/** The loosest provider, for a type that holds any of them. */
export type SomeProvider = Provider<Capability, never>;

export type CapabilitiesOf<TProvider extends SomeProvider> = TProvider["capabilities"][number];

export type OptionsOf<TProvider extends SomeProvider> = Parameters<
  TProvider["send"]
>[1] extends infer TOptions
  ? TOptions extends object
    ? TOptions
    : NoOptions
  : NoOptions;
