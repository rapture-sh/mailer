/**
 * Publishes this version, or reports that there is nothing to publish and exits 0.
 *
 * `changesets/action` runs the publish command on every push to `main` with no changesets
 * pending, which is every push after a release, so a bare `npm publish` fails the workflow
 * with "cannot publish over the previously published versions" on the next unrelated
 * commit. `changeset publish` skips an already published version instead, but it looks for
 * an auth token before it publishes and so cannot do the OIDC exchange that trusted
 * publishing needs. This does the skip and leaves the publishing to npm.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const { name, version } = JSON.parse(readFileSync("package.json", "utf8"));

// shell: true because npm is a .cmd on Windows, where this also gets run by hand.
const lookup = spawnSync("npm", ["view", `${name}@${version}`, "version"], {
  shell: true,
  stdio: "pipe",
});

// npm exits non-zero both for a version that is not there and for a registry it could not
// reach. Treating both as not published leaves the real failure to `npm publish`, which
// reports it better than this could.
if (lookup.status === 0) {
  console.log(`${name}@${version} is already published, so there is nothing to do.`);
  process.exit(0);
}

const published = spawnSync("npm", ["publish"], { shell: true, stdio: "inherit" });

process.exit(published.status ?? 1);
