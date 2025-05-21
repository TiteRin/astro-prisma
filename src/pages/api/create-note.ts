import { isAuthenticatedRequest } from "@/utils/apiAuth";
import { createUnauthorizedResponse } from "@/utils/apiAuth";
import { validateNote } from "@/utils/noteValidation";
import { APIRoute } from "astro";
import matter from "gray-matter";
import path from "path";
import { sftpClient } from "@/utils/sftpClient";
import { summaryValidationSchema } from "@/content.config";
import { randomUUID } from "crypto";
import { triggerNetlifyBuild } from "@/utils/netlifyTrigger";

export const prerender = false;


// Notification de progression
interface ProgressNotification {
    type: 'info' | 'success' | 'error' | 'warning';
    message: string;
    step: string;
};

export const POST: APIRoute = async ({ request }) => {

    const coverImageUrl = import.meta.env.COVER_IMAGE_URL;
    const buildUrl = import.meta.env.NETLIFY_BUILD_HOOK;

    if (!coverImageUrl) {
        return new Response(
            JSON.stringify({ success: false, errors: ["URL de couverture manquante"] }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    if (!buildUrl) {
        return new Response(
            JSON.stringify({ success: false, errors: ["URL de build manquante"] }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const data = await request.formData();
    const file = data.get("new-note") as File;
    const coverImage = data.get("cover-image") as File;
    const contributor = data.get("contributor") as string;


    // Create a TransformStream for progress notifications
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    async function sendProgress(notification: ProgressNotification) {
        await writer.write(new TextEncoder().encode(JSON.stringify(notification) + '\n'));
    }

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

            let note;
            
            try {
                note = await validateNote(file);
            } catch (error) {
                await sendProgress({ type: 'error', message: `Erreur de validation : ${error}`, step: "validation" });
                return;
            }

            await sendProgress({ type: 'success', message: "Validation des fichiers réussie", step: "validation" });

            const { attributes, body } = note;
            let processedAttributes = { ...attributes};

            // Use the contributor from the form if provided
            if (contributor) {
                processedAttributes.contributor = contributor;
            } else if (!processedAttributes.contributor) {
                await sendProgress({ type: 'error', message: "Contributeur manquant", step: "validation" });
                return;
            }

            if (!processedAttributes.lastModification) {
                processedAttributes.lastModification = new Date();
            } else {
                processedAttributes.lastModification = new Date(processedAttributes.lastModification);
            }

            // Prepare cover image
            const extension = path.extname(coverImage.name);
            const uniqueCoverImageId = randomUUID().replace(/[^a-zA-Z0-9]/gi, '-').toLocaleLowerCase();

            // Create cover image file name
            const sanitizedCoverImageName = `${uniqueCoverImageId}${extension}`;

            await sendProgress({ type: 'info', message: "Envoi de la couverture en cours...", step: "envoi" });

            // Upload the cover image to the sftp server
            await sftpClient.connect();
            await sftpClient.uploadCoverImage(coverImage, sanitizedCoverImageName);

            await sendProgress({ type: 'success', message: "Envoi de la couverture réussi", step: "envoi" });

            // Update the image URL in the frontmatter
            processedAttributes.image = {
                url: `${coverImageUrl}/${sanitizedCoverImageName}`,
                alt: processedAttributes.image?.alt || `Couverture de ${processedAttributes.bookTitle}`
            };

            const validationData = summaryValidationSchema.parse(processedAttributes);
            const fileContent = matter.stringify(body, processedAttributes);

            await sendProgress({ type: 'info', message: "Envoi de la fiche de lecture en cours...", step: "envoi" });

            // Upload the note to the sftp server
            const uploadResult = await sftpClient.uploadNote(fileContent, `${processedAttributes.bookTitle}.mdx`);

            if (uploadResult.success) {
                await sendProgress({ type: 'success', message: "Envoi de la fiche de lecture réussi", step: "envoi" });
            } else {
                console.log(uploadResult.error);
                await sendProgress({ type: 'error', message: "Erreur lors de l'envoi de la fiche de lecture", step: "envoi" });
                return;
            }

            await sendProgress({ type: 'info', message: "Déclenchement du build en cours...", step: "build" });
            const buildResult = await triggerNetlifyBuild();
            await sendProgress({ type: buildResult.success ? 'success' : 'error', message: buildResult.message, step: "build" });
            
        } catch (error) {
            console.error('Erreur lors de la création de la fiche de lecture:', error);

            return new Response(
                JSON.stringify({ 
                    success: false, 
                    errors: ["Erreur lors de la création de la fiche de lecture", error] 
                }),
                { 
                    status: 500, 
                    headers: { 'Content-Type': 'application/json' } 
                }
            );
        }
        finally {
            try {
                await sftpClient.disconnect();
            } catch (e) { /*  */ }

            try {
                await writable.close();
            } catch (e) { /*  */ }
        }
    })();

    return new Response(readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
};