/** A reader, as the caller knows them. */
export type Recipient = {
  email: string;
  name?: string;
};

export type Attachment = {
  filename: string;
  /** Bytes, or an already base64 encoded string. A provider encodes it for its own API. */
  content: Uint8Array | string;
  contentType?: string;
  /** Present to reference the file from the html as `cid:<cid>` rather than attach it. */
  inline?: { cid: string };
};

/** One message, rendered and addressed, as a provider receives it. */
export type MailMessage = {
  from: string;
  to: Recipient;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: readonly Attachment[];
  idempotencyKey?: string;
  headers?: Readonly<Record<string, string>>;
  sendAt?: Date;
};

/**
 * `Ada Lovelace <ada@example.com>`, or the bare address when there is no name.
 *
 * The name is quoted through JSON, because a display name holding a comma or a quote would
 * otherwise read as two addresses.
 */
export function formatAddress(recipient: Recipient): string {
  if (recipient.name === undefined || recipient.name === "") return recipient.email;

  return `${JSON.stringify(recipient.name)} <${recipient.email}>`;
}
