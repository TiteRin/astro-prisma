import type { APIRoute } from "astro";
import matter from 'gray-matter';
import { GitHubService } from "../../lib/services/github.js";
import { FileValidator } from "../../lib/services/file-validator.js";
import fs from 'fs/promises';
import path from 'path';

export const prerender = false;

// Progress notification type
type ProgressNotification = {
    type: 'info' | 'success' | 'error' | 'warning';
    message: string;
    step: string;
};

async function saveFileLocally(filePath: string, content: Buffer | string) {
    // Ensure the directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    // Write the file
    await fs.writeFile(filePath, content);
}

export const POST: APIRoute = async ({request}) => {
    const uploadMode = import.meta.env.UPLOAD_MODE || 'remote';
    const github = new GitHubService();

    const data = await request.formData();
    const file = data.get("new-note") as File;
    const coverImage = data.get("cover-image") as File;
    const contributor = data.get("contributor") as string;
    const isDraft = data.get("is_draft") === "true";

    // Create a TransformStream for progress notifications
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    
    async function sendProgress(notification: ProgressNotification) {
        await writer.write(new TextEncoder().encode(JSON.stringify(notification) + '\n'));
    }

    // Start processing in the background
    (async () => {
        try {
            if (!file) {
                await sendProgress({ type: 'error', message: "Fichier manquant", step: "validation" });
                return;
            }

            if (!coverImage) {
                await sendProgress({ type: 'error', message: "Image de couverture manquante", step: "validation" });
                return;
            }

            await sendProgress({ type: 'info', message: "Validation des fichiers en cours...", step: "validation" });

            // Validate note
            const validation = await FileValidator.validateNote(file, contributor);
            if (!validation.valid || !validation.data || !validation.content) {
                await sendProgress({ type: 'error', message: "Échec de la validation", step: "validation" });
                if (validation.errors) {
                    for (const error of validation.errors) {
                        await sendProgress({ type: 'error', message: `${error.field}: ${error.message}`, step: "validation" });
                    }
                }
                return;
            }

            // Validate images in the markdown content
            const imageUrls = FileValidator.extractImageUrls(validation.content);
            if (imageUrls.length > 0) {
                await sendProgress({ type: 'info', message: "Validation des images en cours...", step: "validation" });
                const imageValidation = await FileValidator.validateImageUrls(imageUrls);
                if (!imageValidation.valid) {
                    await sendProgress({ 
                        type: 'error', 
                        message: "Échec de la validation des images",
                        step: "validation"
                    });
                    for (const error of imageValidation.errors) {
                        await sendProgress({ type: 'error', message: error, step: "validation" });
                    }
                    return;
                }
                await sendProgress({ type: 'success', message: "Validation des images réussie", step: "validation" });
            }

            // Prepare files
            const coverImageName = `${file.name.replace(/\.(md|mdx)$/, '')}.${coverImage.name.split('.').pop()}`;
            const coverImagePath = `public/img/${coverImageName}`;
            const filePath = `src/summaries/${file.name}`;

            // Update the image URL in the frontmatter
            validation.data.image = {
                url: `/img/${coverImageName}`,
                alt: validation.data.image?.alt || `Couverture de ${validation.data.bookTitle}`
            };

            const fileContent = matter.stringify(validation.content, validation.data);

            // Handle local upload if needed
            if (uploadMode === 'local' || uploadMode === 'both') {
                try {
                    await sendProgress({ type: 'info', message: "Sauvegarde locale des fichiers...", step: "local" });
                    // Save markdown file
                    await saveFileLocally(filePath, fileContent);
                    // Save cover image
                    const coverImageContent = await coverImage.arrayBuffer();
                    await saveFileLocally(coverImagePath, Buffer.from(coverImageContent));
                    await sendProgress({ type: 'success', message: "Sauvegarde locale réussie", step: "local" });
                } catch (error) {
                    console.error('Error saving files locally:', error);
                    await sendProgress({ type: 'error', message: "Erreur lors de la sauvegarde locale", step: "local" });
                    if (uploadMode === 'local') {
                        return;
                    }
                }
            }

            // Handle remote upload if needed
            if (uploadMode === 'remote' || uploadMode === 'both') {
                try {
                    await sendProgress({ type: 'info', message: "Envoi des fichiers vers GitHub...", step: "remote" });

                    const coverImageContent = await coverImage.arrayBuffer();
                    const result = await github.uploadFiles([
                        {
                            path: coverImagePath,
                            content: Buffer.from(coverImageContent)
                        },
                        {
                            path: filePath,
                            content: fileContent
                        }
                    ], isDraft, {
                        title: validation.data.bookTitle,
                        contributor: validation.data.contributor,
                        lastModification: validation.data.lastModification
                    });

                    await sendProgress({ type: 'success', message: result.message, step: "remote" });
                } catch (error) {
                    console.error('Error uploading to GitHub:', error);
                    await sendProgress({ type: 'error', message: "Erreur lors de l'envoi vers GitHub", step: "remote" });
                    if (uploadMode === 'remote') {
                        return;
                    }
                }
            }

            await sendProgress({ type: 'success', message: "Traitement terminé avec succès", step: "complete" });
        } catch (error) {
            console.error('Unexpected error:', error);
            await sendProgress({ type: 'error', message: "Une erreur inattendue s'est produite", step: "error" });
        } finally {
            await writer.close();
        }
    })();

    return new Response(readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}