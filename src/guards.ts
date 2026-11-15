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
