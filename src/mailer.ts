import type { Capability, MessageOptions } from "./capabilities";
import { type CopyConfig, formattersFor, type LocaleOf, translate } from "./copy";
import type { Attachment, MailMessage, Recipient } from "./message";
import type { CommonCapabilitiesOf, CommonOptionsOf, Provider, SomeProvider } from "./provider";
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
import { textFromHtml } from "./text";

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

/**
 * The letters, whether they were handed over on their own or beside their copy. A letter
 * actually named `letters` is told apart by being letter shaped.
 */
export type LettersIn<TRegistry> = TRegistry extends { letters: infer TLetters }
  ? TLetters
  : TRegistry;

/**
 * Both branches are needed. A generated registry's `copy` is optional, so it arrives as
 * `copy: Config | undefined` once it has been read back out and passed on, and under
 * `exactOptionalPropertyTypes` a property that can hold `undefined` does not match an
 * optional one. Matching only the optional shape silently lost every locale.
 */
type CopyIn<TRegistry> = TRegistry extends { copy: infer TCopy }
  ? NonNullable<TCopy>
  : TRegistry extends { copy?: infer TCopy }
    ? NonNullable<TCopy>
    : never;

export type LocaleIn<TRegistry> = LocaleOf<CopyIn<TRegistry>>;

/**
 * Every sender the letters in a registry name.
 *
 * A hand written letter's sender is already a key of the senders, because the builder was
 * handed them. A generated one carries the name it was built with, which is how a letter
 * file naming a mailbox the mailer never declared is caught here rather than at send time.
 */
type SendersNamed<TLetters> = {
  [K in keyof TLetters]: TLetters[K] extends { from?: infer TFrom extends string } ? TFrom : never;
}[keyof TLetters];

type MissingSenders<TRegistry, TSenders> = Exclude<
  SendersNamed<LettersIn<TRegistry>>,
  keyof TSenders
>;

/**
 * Nothing when every sender a letter names was declared, and a requirement for the ones
 * that were not, so the error lands on `senders` and says which is missing.
 */
export type RequiredSenders<TRegistry, TSenders> = [MissingSenders<TRegistry, TSenders>] extends [
  never,
]
  ? Record<never, never>
  : { senders: Record<MissingSenders<TRegistry, TSenders>, string> };

/**
 * Every letter that attaches something of its own.
 *
 * A generated letter whose header declares attachments has the property required rather
 * than optional, which is the only way to tell it apart from a letter that merely could
 * have them. See `TemplatesFor`.
 */
type AttachingLetters<TLetters> = {
  [K in keyof TLetters]: TLetters[K] extends { attachments: (...args: never) => unknown }
    ? K
    : never;
}[keyof TLetters];

/**
 * The letters this mailer can be asked for: all of them, less the ones that attach files
 * where the provider cannot send them.
 *
 * A letter's attachments never reach the call site, so `MessageOptions` cannot gate them
 * and the capability is checked here instead. The error lands on the name, at the send that
 * could not have worked.
 *
 * It is deliberately not a requirement on the config, which would fail earlier and read
 * better: a config level conditional over the provider's capabilities is undecidable for a
 * caller who takes its provider as a type parameter, and TypeScript requires an object to
 * satisfy both branches of a deferred conditional, so `mailerFor(provider)` would stop
 * compiling for everyone with an attaching letter.
 *
 * It covers generated letters, whose registry states what they carry. A hand written letter
 * declares `attachments` as an optional property, so it cannot be told apart from one that
 * has none without a cast in `letterBuilder`.
 */
export type SendableNames<TRegistry, TCapabilities> = "attachments" extends TCapabilities
  ? keyof LettersIn<TRegistry> & string
  : Exclude<keyof LettersIn<TRegistry> & string, AttachingLetters<LettersIn<TRegistry>>>;

/** A reader carries a locale only where there are catalogs to read it against. */
export type Reader<TLocale extends string> = [TLocale] extends [never]
  ? Recipient
  : Recipient & { locale?: TLocale };

type ToArg<TLetter, TLocale extends string> = TLetter extends { addressed: "inbox" }
  ? { to?: Reader<TLocale> }
  : { to: Reader<TLocale> };

export type SendTemplateArgs<
  TLetter,
  TLocale extends string,
  TCapabilities extends Capability,
  TOptions extends object,
> = ToArg<TLetter, TLocale> &
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
  TRegistry extends object,
> = {
  provider: TProvider;
  /** Every address this mailer may send from, by name. A letter names one of these keys. */
  senders: TSenders;
  /** The sender for a letter that names none. Required once there is more than one. */
  from?: keyof TSenders & string;
  /**
   * The letters, either on their own or as `{ letters, copy }` where they are
   * localised. A generated module exports exactly that.
   */
  templates?: (build: LetterBuilder<keyof TSenders & string>) => TRegistry;
  retry?: Partial<Retry>;
  /**
   * Whether a letter that renders html and no text gets a text part derived from it.
   * On by default: a message with no text alternative is likelier to be filtered, and a
   * letter file has nowhere to write a second body. A letter that renders its own text
   * keeps it, and `send` is left alone, since a caller passing html meant that message.
   */
  autoText?: boolean;
} & RequiredSenders<TRegistry, TSenders>;

/**
 * With no templates configured there is no `sendTemplate`, because a template registry is
 * the only thing that would give it a name to take.
 */
export type Mailer<
  TSender extends string,
  TRegistry,
  TCapabilities extends Capability,
  TOptions extends object,
> = {
  readonly provider: string;
  send(args: SendArgs<TSender, TCapabilities, TOptions>): Promise<MailResult>;
} & (keyof LettersIn<TRegistry> extends never
  ? Record<never, never>
  : {
      sendTemplate<TName extends SendableNames<TRegistry, TCapabilities>>(
        name: TName,
        args: SendTemplateArgs<
          LettersIn<TRegistry>[TName],
          LocaleIn<TRegistry>,
          TCapabilities,
          TOptions
        >,
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
  attachments?: (fields: LooseFields, context: RenderContext) => readonly Attachment[];
};

type LooseRegistry =
  | Record<string, LooseLetter>
  | { letters: Record<string, LooseLetter>; copy?: CopyConfig };

type LooseArgs = Record<string, unknown> & {
  from?: string;
  to?: Recipient & { locale?: string };
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
  templates?: (build: LetterBuilder<string>) => LooseRegistry;
  retry?: Partial<Retry>;
  autoText?: boolean;
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

/** A registry that keeps its letters under `letters`, rather than being them. */
function isWrapped(
  registry: LooseRegistry,
): registry is { letters: Record<string, LooseLetter>; copy?: CopyConfig } {
  if (!("letters" in registry)) return false;

  const letters: unknown = Reflect.get(registry, "letters");

  // A letter of its own called `letters` is letter shaped, so it is not the wrapper.
  return typeof letters === "object" && letters !== null && !("addressed" in letters);
}

export function createMailer<
  const TProvider extends SomeProvider,
  const TSenders extends Senders,
  const TRegistry extends object = NoLetters,
>(
  config: MailerConfig<TProvider, TSenders, TRegistry>,
): Mailer<
  keyof TSenders & string,
  TRegistry,
  CommonCapabilitiesOf<TProvider>,
  CommonOptionsOf<TProvider>
> {
  // The two assertions in this function are the boundary between a public type that
  // depends on the provider and the registry, and an implementation that cannot be
  // written generically over either. They are the only ones in src/, and the type tests
  // are what prove the public side of the boundary holds.
  const loose = config as unknown as LooseConfig;

  const names = Object.keys(loose.senders);

  if (names.length === 0) throw new Error("a mailer needs at least one sender");

  const registry: LooseRegistry = loose.templates?.(letterBuilder()) ?? {};
  const wrapped = isWrapped(registry);
  const letters: Record<string, LooseLetter> = wrapped ? registry.letters : registry;
  const copy = wrapped ? registry.copy : undefined;
  const retry: Retry = { ...defaultRetry, ...loose.retry };
  const provider = loose.provider;
  const autoText = loose.autoText ?? true;
  const fallback = loose.from ?? (names.length === 1 ? names[0] : undefined);

  // The registry is built before this on purpose: a mailer whose every letter names its
  // own sender needs no default, and there is no way to know that until the letters
  // exist. A letter that names none is what makes a default necessary, so it is named.
  if (fallback === undefined) {
    const orphan = Object.entries(letters).find(([, letter]) => letter.from === undefined)?.[0];

    if (orphan !== undefined) {
      throw new Error(
        `the '${orphan}' letter names no sender, so 'from' has to name the default one, one of: ${names.join(", ")}`,
      );
    }
  }

  /**
   * Nothing where a mailer has several senders, no default, and nothing named one. A letter
   * in that state is refused at construction, so this is the `send` that could not have
   * worked: it has no letter to fall back on and is told at the call rather than at startup.
   */
  const addressFor = (key: string | undefined): string => {
    if (key === undefined) {
      throw new Error(
        `this mailer has no default sender, so 'from' has to name one of: ${names.join(", ")}`,
      );
    }

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
    attachments: readonly Attachment[] = args.attachments ?? [],
  ): MailMessage => ({
    from,
    to,
    subject,
    ...(rendered.html === undefined ? {} : { html: rendered.html }),
    ...(rendered.text === undefined ? {} : { text: rendered.text }),
    ...(replyTo === undefined ? {} : { replyTo }),
    ...(attachments.length === 0 ? {} : { attachments }),
    ...(args.idempotencyKey === undefined ? {} : { idempotencyKey: args.idempotencyKey }),
    ...(args.sendAt === undefined ? {} : { sendAt: args.sendAt }),
    ...(args.headers === undefined ? {} : { headers: args.headers }),
  });

  const post = (message: MailMessage, args: LooseArgs): Promise<MailResult> =>
    withRetry(retry, () => provider.send(message, providerOptions(args)));

  /** Markup that carried no words gives no text part rather than an empty one. */
  const withText = (rendered: Rendered): Rendered => {
    if (autoText === false || rendered.text !== undefined || rendered.html === undefined) {
      return rendered;
    }

    const text = textFromHtml(rendered.html);

    return text === "" ? rendered : { ...rendered, text };
  };

  const mailer = {
    provider: provider.name,

    send: async (args: LooseArgs): Promise<MailResult> => {
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

    sendTemplate: async (name: string, args: LooseArgs): Promise<MailResult> => {
      const letter = letters[name];

      if (letter === undefined) throw new Error(`no letter named '${name}'`);

      // Both guards are unreachable from typed code and are here for a JavaScript caller.
      const to = args.to ?? (letter.inbox === undefined ? undefined : { email: letter.inbox });

      if (to === undefined) throw new Error(`a '${name}' letter needs a reader`);

      const fields = args.fields ?? {};
      const reader: Recipient = {
        email: to.email,
        ...(to.name === undefined ? {} : { name: to.name }),
      };
      const locale = to.locale ?? copy?.default ?? "";
      const context: RenderContext = {
        reader,
        locale,
        t: (key, values) => {
          if (copy === undefined) {
            throw new Error(`a letter asked for the copy key '${key}' with no catalogs configured`);
          }

          return translate(copy, locale, key, values);
        },
        ...formattersFor(locale, copy?.default ?? locale),
      };
      const subject =
        typeof letter.subject === "string" ? letter.subject : letter.subject(fields, context);

      const message = compose(
        addressFor(letter.from ?? fallback),
        reader,
        subject,
        withText(letter.body(fields, context)),
        // The call wins over the letter's own: a letter declares where a reply belongs in
        // general, and a send that passes one knows better for this message.
        args.replyTo ?? letter.replyTo?.(fields, context),
        args,
        // The letter's own first, then the caller's, so a receipt keeps its logo above
        // whatever was passed in beside it.
        [...(letter.attachments?.(fields, context) ?? []), ...(args.attachments ?? [])],
      );

      return post(message, args);
    },
  };

  return mailer as unknown as Mailer<
    keyof TSenders & string,
    TRegistry,
    CommonCapabilitiesOf<TProvider>,
    CommonOptionsOf<TProvider>
  >;
}
