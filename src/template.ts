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
