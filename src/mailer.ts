import type { Capability, MessageOptions } from "./capabilities";
import type { Attachment, MailMessage, Recipient } from "./message";
import type { CapabilitiesOf, OptionsOf, Provider, SomeProvider } from "./provider";
import type { MailResult } from "./result";
import { defaultRetry, type Retry, withRetry } from "./retry";
import {
  type FieldsOf,
  type LetterBuilder,
  letterBuilder,
  type NoLetters,
  type RenderContext,
  type Rendered,
} from "./template";

export type Senders = Readonly<Record<string, string>>;

/** One of the two at least, so a message with no body cannot be sent. */
type Content = { html: string; text?: string } | { text: string; html?: string };

export type SendArgs<
  TSender extends string,
  TCapabilities extends Capability,
  TOptions extends object,
> = {
  /** A key of the senders you declared. Left out, the default sender is used. */
  from?: TSender;
  to: Recipient;
  subject: string;
} & Content &
  MessageOptions<TCapabilities> &
  Partial<TOptions>;

type FieldsArg<TFields> = keyof TFields extends never ? { fields?: TFields } : { fields: TFields };

type ToArg<TLetter> = TLetter extends { addressed: "inbox" }
  ? { to?: Recipient }
  : { to: Recipient };

export type SendTemplateArgs<
  TLetter,
  TCapabilities extends Capability,
  TOptions extends object,
> = ToArg<TLetter> &
  FieldsArg<FieldsOf<TLetter>> &
  MessageOptions<TCapabilities> &
  Partial<TOptions>;

export type MailerConfig<
  TProvider extends SomeProvider,
  TSenders extends Senders,
  // Deliberately looser than Letters: a constraint naming a letter's field type gives the
  // builder call a contextual return type, and TypeScript then infers the fields from the
  // constraint instead of from the type argument. The builder is the only way to make a
  // letter, so nothing is lost.
  TLetters extends Record<string, object>,
> = {
  provider: TProvider;
  /** Every address this mailer may send from, by name. A letter names one of these keys. */
  senders: TSenders;
  /** The sender for a letter that names none. Required once there is more than one. */
  from?: keyof TSenders & string;
  templates?: (build: LetterBuilder<keyof TSenders & string>) => TLetters;
  retry?: Partial<Retry>;
};

/**
 * With no templates configured there is no `sendTemplate`, because a template registry is
 * the only thing that would give it a name to take.
 */
export type Mailer<
  TSender extends string,
  TLetters,
  TCapabilities extends Capability,
  TOptions extends object,
> = {
  readonly provider: string;
  send(args: SendArgs<TSender, TCapabilities, TOptions>): Promise<MailResult>;
} & (keyof TLetters extends never
  ? Record<never, never>
  : {
      sendTemplate<TName extends keyof TLetters & string>(
        name: TName,
        args: SendTemplateArgs<TLetters[TName], TCapabilities, TOptions>,
      ): Promise<MailResult>;
    });

type LooseFields = Record<string, unknown>;

type LooseLetter = {
  addressed: "caller" | "inbox";
  inbox?: string;
  from?: string;
  subject: string | ((fields: LooseFields, context: RenderContext) => string);
  body: (fields: LooseFields, context: RenderContext) => Rendered;
  replyTo?: (fields: LooseFields, context: RenderContext) => string;
};

type LooseArgs = Record<string, unknown> & {
  from?: string;
  to?: Recipient;
  subject?: string;
  html?: string;
  text?: string;
  fields?: LooseFields;
  attachments?: readonly Attachment[];
  idempotencyKey?: string;
  sendAt?: Date;
  replyTo?: string;
  headers?: Readonly<Record<string, string>>;
};

type LooseConfig = {
  provider: Provider<Capability, Record<string, unknown>>;
  senders: Record<string, string>;
  from?: string;
  templates?: (build: LetterBuilder<string>) => Record<string, LooseLetter>;
  retry?: Partial<Retry>;
};

/** Everything the mailer puts on the message itself. The rest belongs to the provider. */
const OWN_KEYS = new Set([
  "from",
  "to",
  "subject",
  "html",
  "text",
  "fields",
  "attachments",
  "idempotencyKey",
  "sendAt",
  "replyTo",
  "headers",
]);

function providerOptions(args: LooseArgs): Record<string, unknown> {
  const options: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(args)) {
    if (!OWN_KEYS.has(key)) options[key] = value;
  }

  return options;
}

export function createMailer<
  const TProvider extends SomeProvider,
  const TSenders extends Senders,
  const TLetters extends Record<string, object> = NoLetters,
>(
  config: MailerConfig<TProvider, TSenders, TLetters>,
): Mailer<keyof TSenders & string, TLetters, CapabilitiesOf<TProvider>, OptionsOf<TProvider>> {
  // The two assertions in this function are the boundary between a public type that
  // depends on the provider and the registry, and an implementation that cannot be
  // written generically over either. They are the only ones in src/, and the type tests
  // are what prove the public side of the boundary holds.
  const loose = config as unknown as LooseConfig;

  const names = Object.keys(loose.senders);
  const fallback = loose.from ?? (names.length === 1 ? names[0] : undefined);

  if (fallback === undefined) {
    throw new Error(
      names.length === 0
        ? "a mailer needs at least one sender"
        : `'from' has to name the default sender, one of: ${names.join(", ")}`,
    );
  }

  const letters = loose.templates?.(letterBuilder()) ?? {};
  const retry: Retry = { ...defaultRetry, ...loose.retry };
  const provider = loose.provider;

  const addressFor = (key: string): string => {
    const sender = loose.senders[key];

    if (sender === undefined) throw new Error(`no sender named '${key}'`);

    return sender;
  };

  const compose = (
    from: string,
    to: Recipient,
    subject: string,
    rendered: Rendered,
    replyTo: string | undefined,
    args: LooseArgs,
  ): MailMessage => ({
    from,
    to,
    subject,
    ...(rendered.html === undefined ? {} : { html: rendered.html }),
    ...(rendered.text === undefined ? {} : { text: rendered.text }),
    ...(replyTo === undefined ? {} : { replyTo }),
    ...(args.attachments === undefined ? {} : { attachments: args.attachments }),
    ...(args.idempotencyKey === undefined ? {} : { idempotencyKey: args.idempotencyKey }),
    ...(args.sendAt === undefined ? {} : { sendAt: args.sendAt }),
    ...(args.headers === undefined ? {} : { headers: args.headers }),
  });

  const post = (message: MailMessage, args: LooseArgs): Promise<MailResult> =>
    withRetry(retry, () => provider.send(message, providerOptions(args)));

  const mailer = {
    provider: provider.name,

    send: (args: LooseArgs): Promise<MailResult> => {
      if (args.to === undefined || args.subject === undefined) {
        throw new Error("a message needs a reader and a subject");
      }

      const rendered: Rendered = {
        ...(args.html === undefined ? {} : { html: args.html }),
        ...(args.text === undefined ? {} : { text: args.text }),
      };

      const message = compose(
        addressFor(args.from ?? fallback),
        args.to,
        args.subject,
        rendered,
        args.replyTo,
        args,
      );

      return post(message, args);
    },

    sendTemplate: (name: string, args: LooseArgs): Promise<MailResult> => {
      const letter = letters[name];

      if (letter === undefined) throw new Error(`no letter named '${name}'`);

      // Both guards are unreachable from typed code and are here for a JavaScript caller.
      const to = args.to ?? (letter.inbox === undefined ? undefined : { email: letter.inbox });

      if (to === undefined) throw new Error(`a '${name}' letter needs a reader`);

      const fields = args.fields ?? {};
      const context: RenderContext = { reader: to };
      const subject =
        typeof letter.subject === "string" ? letter.subject : letter.subject(fields, context);

      const message = compose(
        addressFor(letter.from ?? fallback),
        to,
        subject,
        letter.body(fields, context),
        letter.replyTo?.(fields, context),
        args,
      );

      return post(message, args);
    },
  };

  return mailer as unknown as Mailer<
    keyof TSenders & string,
    TLetters,
    CapabilitiesOf<TProvider>,
    OptionsOf<TProvider>
  >;
}
