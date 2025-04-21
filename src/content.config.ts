// Import the glob loader
import { glob } from "astro/loaders";
// Import utilities from `astro:content`
import { z, defineCollection } from "astro:content";
// Define a `loader` and `schema` for each collection
export const summaryValidationSchema = z.object({
    bookTitle: z.string(),
    bookAuthors: z.array(z.string()),
    publishedYear: z.number(),
    contributor: z.string(),
    lastModification: z.date(),
    image: z.object({
        url: z.string(),
        alt: z.string().optional()
    }),
    tags: z.array(z.string()),
    summary: z.string()
});
const summaries = defineCollection({
    loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/summaries" }),
    schema: summaryValidationSchema
});
// Export a single `collections` object to register your collection(s)
export const collections = { summaries };