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

/**
 * Everything in a union at once, which is how the members several types have in common are
 * found. A union of one is itself, so a single provider is unaffected.
 */
type UnionToIntersection<TUnion> = (
  TUnion extends unknown
    ? (one: TUnion) => void
    : never
) extends (one: infer TIntersection) => void
  ? TIntersection
  : never;

/** Boxed, because intersecting the unions directly would reduce one provider's to never. */
type BoxedCapabilities<TProvider> = TProvider extends SomeProvider
  ? { capability: CapabilitiesOf<TProvider> }
  : never;

/**
 * What every provider in this type can do, rather than what any of them can.
 *
 * `provider: isProduction ? resend(...) : memory()` infers a union, and reading the
 * capabilities off a union gives their sum: the call site would be offered `sendAt` because
 * Resend can schedule, and a letter's attachments would pass the gate in `SendableNames`
 * because one member can attach, while the other member drops both without a word.
 *
 * It cannot catch every pair. Where one provider happens to be assignable to the other,
 * TypeScript reduces the union to the wider one before this sees it, and there is nothing
 * left to have in common with. That limit is documented in the README and pinned in
 * `tests/types/provider.test-d.ts`.
 */
export type CommonCapabilitiesOf<TProvider extends SomeProvider> =
  UnionToIntersection<BoxedCapabilities<TProvider>> extends {
    capability: infer TCapability extends Capability;
  }
    ? TCapability
    : never;

/**
 * The options every provider in this type accepts. `keyof` a union is already the keys they
 * share, so a union of Resend and the memory provider accepts neither's extras.
 */
export type CommonOptionsOf<TProvider extends SomeProvider> = Pick<
  OptionsOf<TProvider>,
  keyof OptionsOf<TProvider>
>;
