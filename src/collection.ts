import { defineCollection } from "astro/content/config";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

export const issueSchema = ({ image }: { image: () => z.ZodTypeAny }) => z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  slug: z.string(),
  pubDate: z.coerce.date(),
  updatedAt: z.coerce.date(),
  url: z.string().url(),
  coverImage: image().or(z.string().url()).optional(),
  audience: z.string().default("everyone"),
  type: z.string().default("newsletter"),
  section: z.string().optional(),
  tags: z.array(z.string()).default([]),
  wordCount: z.number().optional(),
});

/** Use in src/content.config.ts: `export const collections = { issues: substackCollection() }` */
export function substackCollection(dir = "./src/content/issues") {
  return defineCollection({
    loader: glob({ pattern: "*.md", base: dir }),
    schema: issueSchema,
  });
}
