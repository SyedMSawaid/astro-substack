export interface SubstackOptions {
  /** Publication: `"mypub"`, `"mypub.substack.com"` or a custom domain URL. */
  publication: string;
  /** Where Markdown files are written, relative to the project root. Default `src/content/issues`. */
  dir?: string;
  /** Download images next to the Markdown so the backup is self-contained. Default `true`. */
  downloadImages?: boolean;
  /** Sync when Astro starts (dev and build). Default `true`. */
  sync?: boolean;
  /** Re-download every post even if unchanged. Default `false`. */
  force?: boolean;
  /** Max number of posts to fetch (newest first). Default: all. */
  limit?: number;
  /** Which post types to keep. Default `["newsletter"]`; also `"podcast"`, `"thread"`. */
  types?: string[];
}

export interface ArchiveItem {
  slug: string;
  type: string;
  audience: string;
  post_date: string;
}

export interface Post extends ArchiveItem {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  canonical_url: string;
  updated_at: string;
  cover_image: string | null;
  body_html: string | null;
  section_name?: string | null;
  wordcount?: number;
  postTags?: { name: string }[] | string[];
}

export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
}
