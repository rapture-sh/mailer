export type { Capability, MessageOptions } from "./capabilities";
export {
  createMailer,
  type Mailer,
  type MailerConfig,
  type SendArgs,
  type Senders,
  type SendTemplateArgs,
} from "./mailer";
export { type Attachment, formatAddress, type MailMessage, type Recipient } from "./message";
export type {
  CapabilitiesOf,
  NoOptions,
  OptionsOf,
  Provider,
  SomeProvider,
} from "./provider";
export {
  isTransient,
  type MailError,
  type MailErrorKind,
  type MailErrorOf,
  type MailResult,
  type TransientMailError,
  type TransientMailErrorKind,
} from "./result";
export { defaultRetry, delayFor, type Retry, withRetry } from "./retry";
export type {
  FieldsOf,
  InternalLetter,
  InternalLetterDefinition,
  Letter,
  LetterBuilder,
  LetterDefinition,
  Letters,
  NoFields,
  NoLetters,
  RenderContext,
  Rendered,
  SomeLetter,
} from "./template";
