import { assertNotProduction } from "../guards";
import { type ResendProvider, resend } from "./resend";

/**
 * The port the mock-resend image publishes, which serves the Resend compatible API and the
 * console on one listener. https://github.com/rapture-sh/mock-resend
 */
export const MOCK_RESEND_URL = "http://localhost:9100";

/**
 * mock-resend reads the key as a namespace rather than a credential, and only checks that it
 * begins `re_`. Every send with the same key lands in the same inbox.
 */
export const MOCK_RESEND_API_KEY = "re_test";

/** A url a human pasted may end in a slash, and the provider joins paths with one. */
function host(url: string): string {
  return url.replace(/\/+$/, "");
}

export type MockResendConfig = {
  /** Where mock-resend is listening. Defaults to the port its image publishes. */
  url?: string;
  /** Which inbox to send to. Any key beginning `re_` is accepted. */
  apiKey?: string;
  /** What this deployment is. Defaults to `NODE_ENV` where the runtime has one. */
  environment?: string;
  /** Replaceable, so a test drives this without a container. */
  fetch?: typeof globalThis.fetch;
};

/**
 * The `resend` provider pointed at a local mock-resend.
 *
 * This is a configuration, not a second provider: it returns the same `ResendProvider`, so
 * development and CI exercise the wire format, the error mapping and the capability types
 * that production uses, and only the host changes. That is also why there is no dev or
 * local provider in this package, and why one should not be added: a provider written for
 * development is a provider production never runs.
 */
export function mockResend(config: MockResendConfig = {}): ResendProvider {
  assertNotProduction("mock-resend", config.environment);

  return resend({
    apiKey: config.apiKey ?? MOCK_RESEND_API_KEY,
    baseUrl: host(config.url ?? MOCK_RESEND_URL),
    ...(config.environment === undefined ? {} : { environment: config.environment }),
    ...(config.fetch === undefined ? {} : { fetch: config.fetch }),
  });
}

/** Where to open the captured mail, for printing a link a developer can click. */
export function mockResendConsole(url: string = MOCK_RESEND_URL): string {
  return `${host(url)}/_admin/console/`;
}
