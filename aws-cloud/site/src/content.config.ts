import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// One MDX file per written concept. The file name (without .mdx) must match an
// id in src/data/curriculum.ts; concepts without a file render a "coming soon" page.
const concepts = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./src/content/concepts" }),
  schema: z.object({
    title: z.string(),
    lede: z.string(),
    minutes: z.number(),
    scenes: z.number(),
    prerequisites: z.array(z.string()).default([]),
    docs: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]),
  }),
});

export const collections = { concepts };
