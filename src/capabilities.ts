import type { Attachment } from "./message";

/**
 * What a provider can be asked to do beyond putting one message in one inbox.
 *
 * A capability is a type rather than a runtime flag: the options below exist at the call
 * site only for a provider that declares the matching capability, so asking a provider for
 * something it cannot do is a compile error instead of a 400.
 */
export type Capability = "attachments" | "idempotency" | "schedule" | "replyTo" | "headers";

type OptionShapes = {
  attachments: readonly Attachment[];
  idempotencyKey: string;
  sendAt: Date;
  replyTo: string;
  headers: Readonly<Record<string, string>>;
};

/** The capability each option needs. One entry per option, so neither can drift. */
type NeededFor = {
  attachments: "attachments";
  idempotencyKey: "idempotency";
  sendAt: "schedule";
  replyTo: "replyTo";
  headers: "headers";
};

/**
 * The options a provider with these capabilities accepts. An option whose capability is
 * missing is not optional here, it is absent, which is what makes passing it an error
 * rather than something ignored at runtime.
 */
export type MessageOptions<TCapabilities extends Capability> = {
  [K in keyof OptionShapes as NeededFor[K] extends TCapabilities ? K : never]?: OptionShapes[K];
};
