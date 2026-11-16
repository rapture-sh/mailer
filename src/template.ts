import type { CopyConfig, CopyValues, Formatters } from "./copy";
import type { Attachment, Recipient } from "./message";

export type Rendered = {
  html?: string;
  text?: string;
};

export type Translate = (key: string, values?: CopyValues) => string;

/**
 * What a body is given besides its own fields: who is reading, which locale they are
 * reading in, the copy, and the formatters already bound to that locale.
 *
 * `t` needs a catalog. Without one it throws, which the build step makes unreachable by
 * refusing a letter that calls `t` when no copy is configured.
 */
export type RenderContext = {
  readonly reader: Recipient;
  readonly locale: string;
  readonly t: Translate;
} & Formatters;

export type NoFields = Record<never, never>;

/**
 * What a letter attaches, given its own fields.
 *
 * A letter's attachments are a function of its fields rather than a list, because the
 * interesting ones are the caller's: an invoice is a field, and a logo is a constant the
 * build inlined.
 */
export type Attachments<TFields> = (
  fields: TFields,
  context: RenderContext,
) => readonly Attachment[];

/**
 * What a letter is declared with. `body` is the one inference site for the fields, so a
 * letter with fields states them as a type argument and one without needs nothing.
 */
export type LetterDefinition<TFields, TSender extends string> = {
  /** A key of the senders you declared. Left out, the letter uses the default one. */
  from?: TSender;
  subject: string | ((fields: TFields, context: RenderContext) => string);
  body: (fields: TFields, context: RenderContext) => Rendered;
  replyTo?: (fields: TFields, context: RenderContext) => string;
  attachments?: Attachments<TFields>;
};

export type InternalLetterDefinition<TFields, TSender extends string> = LetterDefinition<
  TFields,
  TSender
> & {
  /** Where it lands. A caller may override it and never has to supply one. */
  inbox: string;
};

/** A letter somebody else reads, so the caller says who. */
export type Letter<TFields = never, TSender extends string = string> = LetterDefinition<
  TFields,
  TSender
> & {
  readonly addressed: "caller";
};

/** A letter that comes to us. Its address is declared here, so the caller needs none. */
export type InternalLetter<
  TFields = never,
  TSender extends string = string,
> = InternalLetterDefinition<TFields, TSender> & {
  readonly addressed: "inbox";
};

export type SomeLetter<TSender extends string = string> =
  | Letter<never, TSender>
  | InternalLetter<never, TSender>;

export type Letters<TSender extends string = string> = Readonly<
  Record<string, SomeLetter<TSender>>
>;

export type NoLetters = Record<never, never>;

/** The fields a letter's body asks for, read off the body itself. */
export type FieldsOf<TLetter> = TLetter extends {
  body: (fields: infer TFields, context: RenderContext) => Rendered;
}
  ? TFields
  : never;

/**
 * Handed to the `templates` callback, carrying the sender keys declared beside it. The
 * discriminant is added here rather than written by a caller, so the two kinds of letter
 * cannot be confused.
 */
export type LetterBuilder<TSender extends string> = {
  letter<TFields = NoFields>(
    definition: LetterDefinition<TFields, TSender>,
  ): Letter<TFields, TSender>;
  internal<TFields = NoFields>(
    definition: InternalLetterDefinition<TFields, TSender>,
  ): InternalLetter<TFields, TSender>;
};

export function letterBuilder<TSender extends string>(): LetterBuilder<TSender> {
  return {
    letter: (definition) => ({ ...definition, addressed: "caller" }),
    internal: (definition) => ({ ...definition, addressed: "inbox" }),
  };
}

/** One letter as a build step writes it: a compiled body, and what to wrap it in. */
export type GeneratedLetter<TFields> = {
  readonly addressed: "caller" | "inbox";
  /** Where an internal letter lands. Present only when `addressed` is `inbox`. */
  readonly inbox?: string;
  readonly from?: string;
  readonly subject: string | ((fields: TFields, context: RenderContext) => string);
  /** A precompiled template, which takes the fields and the context as one object. */
  readonly html: (context: Record<string, unknown>) => string;
  /** What the letter's header declared: inlined files, and the fields that carry one. */
  readonly attachments?: (fields: TFields) => readonly Attachment[];
  readonly text?: (context: Record<string, unknown>) => string;
  /** The field to read a reply address out of, checked against the fields themselves. */
  readonly replyToField?: keyof TFields & string;
  /**
   * What the preview and the checks render with.
   *
   * Partial because an attachment is a field a caller passes and there is no sample value
   * for a file. The build is what insists on a complete sample, and it knows which fields
   * are rendered, so it checks more than this type can.
   */
  readonly sample?: Partial<TFields>;
};

/**
 * What a generated module declares: one entry per letter, saying whether a caller
 * addresses it and what its fields are. Both are written out rather than inferred, because
 * generated code can afford to be explicit and inference here would have to guess.
 */
export type GeneratedSpec = Record<
  string,
  {
    addressed: "caller" | "inbox";
    fields: object;
    /**
     * The sender this letter names, written out so a mailer whose senders do not include
     * it fails to compile rather than at send time. Absent where the letter named none.
     */
    from?: string;
    /** Present where the letter's header declared attachments. */
    attachments?: true;
  }
>;

/** The sender a generated entry names, or nothing where it named none. */
type FromIn<TEntry> = TEntry extends { from: infer TFrom extends string } ? TFrom : never;

/**
 * The letters a generated module hands over, tied to what its spec says they carry.
 *
 * Both halves declare attachments and nothing but this stops them disagreeing: a spec entry
 * without `attachments: true` whose letter attaches a file anyway would pass the capability
 * gate in `SendableNames` and have the file dropped, and the mirror case would promise a
 * function that is not there. The build emits both from one source so it cannot write
 * either, but `defineTemplates` is public and a hand written module can.
 */
export type GeneratedLetters<TSpec extends GeneratedSpec> = {
  [K in keyof TSpec]: GeneratedLetter<TSpec[K]["fields"]> &
    (TSpec[K] extends { attachments: true }
      ? { attachments: (fields: TSpec[K]["fields"]) => readonly Attachment[] }
      : { attachments?: never });
};

/**
 * The attachments half of a generated letter's type.
 *
 * Required rather than optional where the header declared one, which is how the mailer
 * tells an attachment carrying letter from an ordinary one and refuses a provider that
 * cannot send it. An intersection, because `Letter` itself must stay the shape a hand
 * written letter has.
 */
type AttachmentsIn<TEntry, TFields> = TEntry extends { attachments: true }
  ? { attachments: Attachments<TFields> }
  : Record<never, never>;

export type TemplatesFor<TSpec extends GeneratedSpec> = {
  [K in keyof TSpec]: (TSpec[K]["addressed"] extends "inbox"
    ? InternalLetter<TSpec[K]["fields"], FromIn<TSpec[K]>>
    : Letter<TSpec[K]["fields"], FromIn<TSpec[K]>>) &
    AttachmentsIn<TSpec[K], TSpec[K]["fields"]>;
};

/**
 * Turns a generated registry into the callback `createMailer` takes, so a generated module
 * and a hand written one reach the mailer the same way.
 */
export type GeneratedRegistry<TSpec extends GeneratedSpec, TCopy> = {
  letters: GeneratedLetters<TSpec>;
  /** The catalogs, when the letters are localised. */
  copy?: TCopy;
};

export type Registry<TLetters, TCopy> = {
  letters: TLetters;
  copy?: TCopy;
};

export function defineTemplates<TSpec extends GeneratedSpec, TCopy extends CopyConfig = never>(
  registry: GeneratedRegistry<TSpec, TCopy>,
): () => Registry<TemplatesFor<TSpec>, TCopy> {
  const built: Record<string, SomeLetter> = {};

  for (const [name, letter] of Object.entries(registry.letters)) {
    const render = (fields: Record<string, unknown>, context: RenderContext): Rendered => {
      const all = { ...fields, ...context };

      return {
        html: letter.html(all),
        ...(letter.text === undefined ? {} : { text: letter.text(all) }),
      };
    };

    const shared = {
      ...(letter.from === undefined ? {} : { from: letter.from }),
      subject:
        typeof letter.subject === "string"
          ? letter.subject
          : (fields: never, context: RenderContext) => letter.subject(fields, context),
      body: render,
      ...(letter.replyToField === undefined
        ? {}
        : {
            replyTo: (fields: Record<string, unknown>) => String(fields[letter.replyToField]),
          }),
      ...(letter.attachments === undefined
        ? {}
        : { attachments: (fields: Record<string, unknown>) => letter.attachments?.(fields) ?? [] }),
    };

    built[name] =
      letter.addressed === "inbox"
        ? { ...shared, addressed: "inbox", inbox: letter.inbox ?? "" }
        : { ...shared, addressed: "caller" };
  }

  // The one assertion in this factory. A generated module states its own letter kinds and
  // field types, and this maps the entries onto them; nothing here can be written
  // generically over a registry whose shape only the caller knows.
  const letters = built as unknown as TemplatesFor<TSpec>;

  return () => ({
    letters,
    ...(registry.copy === undefined ? {} : { copy: registry.copy }),
  });
}
