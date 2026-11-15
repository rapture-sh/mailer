import type { Recipient } from "./message";

export type Rendered = {
  html?: string;
  text?: string;
};

/** What a body is given besides its own fields. */
export type RenderContext = {
  readonly reader: Recipient;
};

export type NoFields = Record<never, never>;

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
  readonly subject: string | ((fields: TFields) => string);
  /** A precompiled template, which takes the fields and the context as one object. */
  readonly html: (context: Record<string, unknown>) => string;
  readonly text?: (context: Record<string, unknown>) => string;
  /** The field to read a reply address out of, checked against the fields themselves. */
  readonly replyToField?: keyof TFields & string;
  /** What the preview and the checks render with. Compiled against the fields, so it
   * cannot drift from them. */
  readonly sample?: TFields;
};

/**
 * What a generated module declares: one entry per letter, saying whether a caller
 * addresses it and what its fields are. Both are written out rather than inferred, because
 * generated code can afford to be explicit and inference here would have to guess.
 */
export type GeneratedSpec = Record<string, { addressed: "caller" | "inbox"; fields: object }>;

export type GeneratedLetters<TSpec extends GeneratedSpec> = {
  [K in keyof TSpec]: GeneratedLetter<TSpec[K]["fields"]>;
};

export type TemplatesFor<TSpec extends GeneratedSpec> = {
  [K in keyof TSpec]: TSpec[K]["addressed"] extends "inbox"
    ? InternalLetter<TSpec[K]["fields"]>
    : Letter<TSpec[K]["fields"]>;
};

/**
 * Turns a generated registry into the callback `createMailer` takes, so a generated module
 * and a hand written one reach the mailer the same way.
 */
export function defineTemplates<TSpec extends GeneratedSpec>(
  letters: GeneratedLetters<TSpec>,
): () => TemplatesFor<TSpec> {
  const built: Record<string, SomeLetter> = {};

  for (const [name, letter] of Object.entries(letters)) {
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
          : (fields: never) => letter.subject(fields),
      body: render,
      ...(letter.replyToField === undefined
        ? {}
        : {
            replyTo: (fields: Record<string, unknown>) => String(fields[letter.replyToField]),
          }),
    };

    built[name] =
      letter.addressed === "inbox"
        ? { ...shared, addressed: "inbox", inbox: letter.inbox ?? "" }
        : { ...shared, addressed: "caller" };
  }

  // The one assertion in this factory. A generated module states its own letter kinds and
  // field types, and this maps the entries onto them; nothing here can be written
  // generically over a registry whose shape only the caller knows.
  return () => built as unknown as TemplatesFor<TSpec>;
}
