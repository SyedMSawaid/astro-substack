# @syedmsawaid/astro-substack

Astro integration that pulls every post from your Substack publication into Markdown files in your repo (with images), and gives you a ready-made content collection. If Substack disappears, your newsletter is still in git.

## Setup

```sh
npm i @syedmsawaid/astro-substack
```

```js
// astro.config.mjs
import substack from "@syedmsawaid/astro-substack";

export default defineConfig({
  integrations: [substack({ publication: "mypub" })],
});
```

```ts
// src/content.config.ts
import { substackCollection } from "@syedmsawaid/astro-substack/collection";

export const collections = { issues: substackCollection() };
```

Then `getCollection("issues")` as usual. Commit `src/content/issues/` to git: that is your backup.

## What it does

- On every `astro dev` / `astro build` it fetches the archive and writes `<dir>/<slug>.md` with frontmatter (title, subtitle, pubDate, updatedAt, url, coverImage, tags, audience).
- Images are downloaded to `<dir>/_images/<slug>/` and linked relatively, so Astro optimizes them.
- Unchanged posts (same `updatedAt`) are skipped.
- **Never deletes files.** A post removed or edited away on Substack stays in your backup.
- If Substack is unreachable, the build continues with your local copy.

## Options

| Option | Default | |
|---|---|---|
| `publication` | required | `"mypub"`, `"mypub.substack.com"` or a custom domain |
| `dir` | `src/content/issues` | Output folder. Pass the same path to `substackCollection(dir)` |
| `downloadImages` | `true` | |
| `sync` | `true` | Set `false` to use only local files |
| `force` | `false` | Re-download everything |
| `limit` | all | Newest N posts |
| `types` | `["newsletter"]` | Also `"podcast"`, `"thread"` |

Only free posts (audience `everyone`) are backed up. Paid and subscriber-only posts are skipped.

Requires `sharp` in your project for image optimization (Astro default).
