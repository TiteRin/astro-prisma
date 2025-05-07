// Import the glob loader
import { glob } from "astro/loaders";
// Import utilities from `astro:content`
import { z, defineCollection } from "astro:content";
// Define a `loader` and `schema` for each collection
export const summaryValidationSchema = z.object({
    bookTitle: z.string().min(1, "Le titre du livre est requis"),
    bookAuthors: z.array(z.string().min(1, "L'auteur est requis")).min(1, "Au moins un auteur est requis"),
    contributor: z.string().min(1, "Le contributeur est requis"),
    lastModification: z.date(),
    tags: z.array(z.string()),
    image: z.object({
        url: z.string(),
        alt: z.string().optional()
    }).optional(),
    summary: z.string(),
    //keyPoints: z.array(z.string()).min(3, "Au moins 3 points clés sont requis"),
    quotes: z.array(z.string()).optional(),
    //references: z.array(z.string()).optional()
});

export type SummaryData = z.infer<typeof summaryValidationSchema>;

const summaries = defineCollection({
    loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/summaries" }),
    schema: summaryValidationSchema
});
// Export a single `collections` object to register your collection(s)
export const collections = { summaries };