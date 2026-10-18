import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { createConverter, yamlString } from "./convert.js";
import type { ArchiveItem, Logger, Post, SubstackOptions } from "./types.js";

const PAGE = 50;
const CONCURRENCY = 4;

export function baseUrl(publication: string): string {
  const p = publication.trim().replace(/\/+$/, "");
  if (/^https?:\/\//.test(p)) return p;
  if (p.includes(".")) return `https://${p}`;
  return `https://${p}.substack.com`;
}

async function getJson<T>(url: string, attempt = 0): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    return getJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json() as Promise<T>;
}

async function listArchive(base: string, opts: SubstackOptions): Promise<ArchiveItem[]> {
  const items: ArchiveItem[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await getJson<ArchiveItem[]>(
      `${base}/api/v1/archive?sort=new&limit=${PAGE}&offset=${offset}`,
    );
    items.push(...page);
    if (page.length < PAGE || (opts.limit && items.length >= opts.limit)) break;
  }
  return opts.limit ? items.slice(0, opts.limit) : items;
}

/** Substack serves resized images through a CDN; the original sits URL-encoded at the end. */
export function originalImageUrl(src: string): string {
  const m = src.match(/\/(https?%3A%2F%2F.+)$/i);
  return m ? decodeURIComponent(m[1]) : src;
}

async function downloadImage(url: string, dir: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    let ext = extname(new URL(url).pathname).toLowerCase();
    if (!ext || ext.length > 5) ext = "." + (ct.split("/")[1]?.split(";")[0] || "bin");
    const name = new URL(url).pathname.split("/").pop()!.replace(/\.[^.]+$/, "").replace(/[^\w.-]/g, "_");
    const file = `${name}${ext}`;
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, file), Buffer.from(await res.arrayBuffer()));
    return file;
  } catch {
    return null;
  }
}

async function localizeImages(md: string, slug: string, root: string): Promise<string> {
  const dir = join(root, "_images", slug);
  const urls = [...new Set([...md.matchAll(/!\[[^\]]*\]\((https?:[^)\s]+)\)/g)].map((m) => m[1]))];
  for (const url of urls) {
    const file = await downloadImage(originalImageUrl(url), dir);
    if (file) md = md.split(`(${url})`).join(`(./_images/${slug}/${file})`);
  }
  return md;
}

async function localizeCover(url: string | null, slug: string, root: string): Promise<string | null> {
  if (!url) return null;
  const file = await downloadImage(originalImageUrl(url), join(root, "_images", slug));
  return file ? `./_images/${slug}/${file}` : url;
}

async function storedUpdatedAt(file: string): Promise<string | null> {
  if (!existsSync(file)) return null;
  const head = (await readFile(file, "utf8")).slice(0, 2000);
  return head.match(/^updatedAt:\s*"?([^"\n]+)"?/m)?.[1] ?? null;
}

function tagNames(tags: Post["postTags"]): string[] {
  return (tags ?? []).map((t) => (typeof t === "string" ? t : t.name)).filter(Boolean);
}

async function writePost(post: Post, root: string, opts: SubstackOptions, toMd: (h: string) => string) {
  let body = toMd(post.body_html ?? "");
  if (opts.downloadImages !== false) body = await localizeImages(body, post.slug, root);
  const cover = opts.downloadImages !== false
    ? await localizeCover(post.cover_image, post.slug, root)
    : post.cover_image;

  const fm: Record<string, string | number | boolean | string[] | null> = {
    title: post.title,
    subtitle: post.subtitle,
    description: post.description,
    slug: post.slug,
    pubDate: post.post_date,
    updatedAt: post.updated_at,
    url: post.canonical_url,
    coverImage: cover,
    audience: post.audience,
    type: post.type,
    section: post.section_name ?? null,
    tags: tagNames(post.postTags),
    wordCount: post.wordcount ?? null,
  };
  const lines = Object.entries(fm)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) =>
      `${k}: ${Array.isArray(v) ? JSON.stringify(v) : typeof v === "string" ? yamlString(v) : v}`);
  await writeFile(join(root, `${post.slug}.md`), `---\n${lines.join("\n")}\n---\n\n${body}`);
}

export async function syncSubstack(opts: SubstackOptions, projectRoot: string, log: Logger) {
  const base = baseUrl(opts.publication);
  const root = join(projectRoot, opts.dir ?? "src/content/issues");
  const types = opts.types ?? ["newsletter"];
  await mkdir(root, { recursive: true });

  const archive = (await listArchive(base, opts))// Only free posts for now; paid posts would be truncated previews.
    .filter((p) => types.includes(p.type) && p.audience === "everyone");
  const toMd = createConverter();
  const stats = { written: 0, skipped: 0, failed: 0 };

  let next = 0;
  const worker = async () => {
    while (next < archive.length) {
      const item = archive[next++];
      try {
        const post = await getJson<Post>(`${base}/api/v1/posts/${item.slug}`);
        const file = join(root, `${post.slug}.md`);
        if (!opts.force && (await storedUpdatedAt(file)) === post.updated_at) {
          stats.skipped++;
          continue;
        }
        await writePost(post, root, opts, toMd);
        stats.written++;
        log.info(`saved ${relative(projectRoot, file)}`);
      } catch (e) {
        stats.failed++;
        log.warn(`failed ${item.slug}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  log.info(`${archive.length} posts: ${stats.written} saved, ${stats.skipped} unchanged, ${stats.failed} failed`);
  return stats;
}
