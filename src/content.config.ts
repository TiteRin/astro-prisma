import path from "path";
// Import loaders
import { glob } from "astro/loaders";
import { markdownSftpLoader } from "./loaders/markdown-sftp-loader";
// Import utilities from `astro:content`
import { z, defineCollection } from "astro:content";


// Define a `loader` and `schema` for each collection
export const readingNoteValidationSchema = z.object({
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

const remotePath = path.join(import.meta.env.SFTP_FICHES_PATH || "", import.meta.env.ENVIRONMENT || "");
const readingNotes = defineCollection({
    loader: markdownSftpLoader({
        connection: {
            host: import.meta.env.SFTP_HOST || "example.com",
            port: parseInt(import.meta.env.SFTP_PORT || "22"),
            username: import.meta.env.SFTP_USERNAME || "user",
            password: import.meta.env.SFTP_PASSWORD
        },
        remotePath: remotePath
    }),
    schema: readingNoteValidationSchema
});

// const summaries = defineCollection({
//     loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/summaries" }),
//     schema: summaryValidationSchema
// });
// Export a single `collections` object to register your collection(s)
export const collections = { readingNotes };