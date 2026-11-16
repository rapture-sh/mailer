/** `NODE_ENV` where a runtime has one, and nothing where it does not. */
export function currentEnvironment(): string | undefined {
  // Edge runtimes and the Convex isolate have no `process`, so this cannot be read
  // directly even though the Node types say it is always there.
  if (typeof process === "undefined") return undefined;

  return process.env.NODE_ENV;
}

/**
 * Refuses a provider pointed anywhere but its live API in production.
 *
 * A deploy that posts real mail into a mock inbox sends nothing, logs nothing and looks
 * healthy, so this fails at construction instead. Development and tests are free to point
 * the same provider code at anything.
 */
export function assertBaseUrl(
  provider: string,
  baseUrl: string | undefined,
  liveBaseUrl: string,
  environment: string | undefined = currentEnvironment(),
): void {
  if (baseUrl === undefined || baseUrl === "" || baseUrl === liveBaseUrl) return;
  if (environment !== "production") return;

  throw new Error(
    `${provider}: baseUrl is '${baseUrl}' but NODE_ENV is production. ` +
      `Mail would be posted somewhere other than ${liveBaseUrl} and nobody would receive it. ` +
      `Unset baseUrl for a production deployment.`,
  );
}

/**
 * Refuses a provider that captures mail rather than delivering it, in production.
 *
 * The same reasoning as `assertBaseUrl`, one step earlier: a mock cannot be configured into
 * a live deployment, so the mistake is caught at construction rather than by a customer who
 * never got their receipt.
 */
export function assertNotProduction(
  provider: string,
  environment: string | undefined = currentEnvironment(),
): void {
  if (environment !== "production") return;

  throw new Error(
    `${provider}: NODE_ENV is production and this provider captures mail instead of ` +
      `delivering it, so nobody would receive anything that was sent. ` +
      `Use resend() with a live API key for a production deployment.`,
  );
}
