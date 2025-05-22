import matter from "gray-matter";
import { extractImageUrls, validateImageUrls } from "./imageValidation";

export async function validateNote(file: File) {
    const text = await file.text();
    const { data: attributes, content: body } = matter(text);

    if (Object.keys(attributes).length === 0) {
        throw new Error("Aucune donnée dans le frontmatter");
    }

    // Validate images in the markdown content
    const imageUrls = extractImageUrls(body);
    if (imageUrls.length > 0) {
        const validationResult = await validateImageUrls(imageUrls);
        if (!validationResult.valid) {
            throw new Error("Images non valides dans le contenu");
        }
    }

    return {
        attributes,
        body
    };
}