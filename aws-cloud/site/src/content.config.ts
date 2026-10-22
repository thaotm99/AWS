import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// One MDX file per written concept. The file name (without .mdx) must match an
// id in src/data/curriculum.ts; concepts without a file render a "coming soon" page.
const lessonSchema = z.object({
    title: z.string(),
    lede: z.string(),
    minutes: z.number(),
    scenes: z.number(),
    prerequisites: z.array(z.string()).default([]),
    docs: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]),
});

const concepts = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./src/content/concepts" }),
  schema: lessonSchema,
});

// English version of a lesson: same file name as in concepts/. Scene ids carry an "en-" prefix
// (id="en-s1", Story links "#en-s1") so both languages can sit on one page without clashing.
const conceptsEn = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./src/content/concepts-en" }),
  schema: lessonSchema,
});

export const collections = { concepts, conceptsEn };
