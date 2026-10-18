import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";
import { syncSubstack } from "./sync.js";
import type { SubstackOptions } from "./types.js";

export type { SubstackOptions } from "./types.js";
export { syncSubstack } from "./sync.js";

export default function substack(options: SubstackOptions): AstroIntegration {
  return {
    name: "astro-substack",
    hooks: {
      "astro:config:setup": async ({ config, logger }) => {
        if (options.sync === false) return;
        try {
          // Never deletes local files: posts removed from Substack stay in your backup.
          await syncSubstack(options, fileURLToPath(config.root), logger);
        } catch (e) {
          // Offline or Substack down: keep going with the local copy.
          logger.warn(`sync skipped, using existing local files (${(e as Error).message})`);
        }
      },
    },
  };
}
