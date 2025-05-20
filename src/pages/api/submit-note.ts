import {Octokit} from "octokit";
import type {APIRoute} from "astro";
import matter from 'gray-matter';
import {summaryValidationSchema} from "../../content.config.js";
import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { extractImageUrls, validateImageUrls } from "../../utils/imageValidation";

export const prerender = false;

// Progress notification type
type ProgressNotification = {
    type: 'info' | 'success' | 'error' | 'warning';
    message: string;
    step: string;
};

function getOctokitClient() {
    const token = import.meta.env.GITHUB_TOKEN;
    return new Octokit({auth: token});
}

async function saveFileLocally(filePath: string, content: Buffer | string) {
    // Ensure the directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    // Write the file
    await fs.writeFile(filePath, content);
}

export const GET: APIRoute = async ({request}) => {
    const octokit = getOctokitClient();
    const {
        data: {login},
    } = await octokit.rest.users.getAuthenticated();

    return new Response(
        JSON.stringify({
            message: `Hello ${login}`
        }),
        {
            status: 200
        }
    )
}

export const POST: APIRoute = async ({request}) => {
    const uploadMode = import.meta.env.UPLOAD_MODE || 'remote';
    const octokit = getOctokitClient();
    const payload = {
        owner: import.meta.env.GITHUB_OWNER,
        repo: import.meta.env.GITHUB_REPO
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

            // Read the file, and look for some keys in the frontmatter
            const text = await file.text();
            const { data: attributes, content: body } = matter(text);

            if (Object.keys(attributes).length === 0) {
                await sendProgress({ type: 'error', message: "Aucune donnée dans le frontmatter", step: "validation" });
                return;
            }

            // Validate images in the markdown content
            const imageUrls = extractImageUrls(body);
            if (imageUrls.length > 0) {
                await sendProgress({ type: 'info', message: "Validation des images en cours...", step: "validation" });
                const validationResult = await validateImageUrls(imageUrls);
                if (!validationResult.valid) {
                    await sendProgress({ 
                        type: 'error', 
                        message: "Échec de la validation des images",
                        step: "validation"
                    });
                    for (const error of validationResult.errors) {
                        await sendProgress({ type: 'error', message: error, step: "validation" });
                    }
                    return;
                }
                await sendProgress({ type: 'success', message: "Validation des images réussie", step: "validation" });
            }

            let processedAttributes = { ...attributes};

            // Use the contributor from the form if provided
            if (contributor) {
                processedAttributes.contributor = contributor;
            } else if (!processedAttributes.contributor) {
                processedAttributes.contributor = "Default contributor";
            }

            if (!processedAttributes.lastModification) {
                processedAttributes.lastModification = new Date();
            } else {
                processedAttributes.lastModification = new Date(processedAttributes.lastModification);
            }

            // Prepare both files
            const coverImageName = `${file.name.replace(/\.(md|mdx)$/, '')}.${coverImage.name.split('.').pop()}`;
            const coverImagePath = `public/img/${coverImageName}`;
            const filePath = `src/summaries/${file.name}`;

            // Update the image URL in the frontmatter
            processedAttributes.image = {
                url: `/img/${coverImageName}`,
                alt: processedAttributes.image?.alt || `Couverture de ${processedAttributes.bookTitle}`
            };

            const validationData = summaryValidationSchema.parse(processedAttributes);
            const fileContent = matter.stringify(body, processedAttributes);

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
                    
                    // Get the current tree SHA
                    try {
                        const branchName = import.meta.env.GITHUB_BRANCH || "main";
                        await sendProgress({ type: 'info', message: `Tentative de récupération de l'arbre Git pour la branche ${branchName}...`, step: "remote" });
                        
                        const { data: { sha: baseTree } } = await octokit.rest.git.getTree({
                            ...payload,
                            tree_sha: branchName,
                            recursive: "true"
                        });
                        
                        await sendProgress({ type: 'success', message: `Arbre Git récupéré avec succès (SHA: ${baseTree.substring(0, 7)})`, step: "remote" });
                        
                        // Create blobs for both files
                        const coverImageContent = await coverImage.arrayBuffer();
                        const { data: { sha: coverImageBlob } } = await octokit.rest.git.createBlob({
                            ...payload,
                            content: Buffer.from(coverImageContent).toString('base64'),
                            encoding: 'base64'
                        });

                        const { data: { sha: fileBlob } } = await octokit.rest.git.createBlob({
                            ...payload,
                            content: Buffer.from(fileContent).toString('base64'),
                            encoding: 'base64'
                        });

                        // Create a new tree with both files
                        const { data: { sha: newTree } } = await octokit.rest.git.createTree({
                            ...payload,
                            base_tree: baseTree,
                            tree: [
                                {
                                    path: coverImagePath,
                                    mode: '100644',
                                    type: 'blob',
                                    sha: coverImageBlob
                                },
                                {
                                    path: filePath,
                                    mode: '100644',
                                    type: 'blob',
                                    sha: fileBlob
                                }
                            ]
                        });

                        // Get the latest commit
                        const { data: { object: { sha: parentCommit } } } = await octokit.rest.git.getRef({
                            ...payload,
                            ref: `heads/${branchName}`
                        });

                        // Create a new commit
                        const { data: { sha: newCommit } } = await octokit.rest.git.createCommit({
                            ...payload,
                            message: `[fiche] Ajout d'une nouvelle fiche - ${file.name}`,
                            tree: newTree,
                            parents: [parentCommit]
                        });

                        // Update the reference
                        await octokit.rest.git.updateRef({
                            ...payload,
                            ref: `heads/${branchName}`,
                            sha: newCommit
                        });

                        await sendProgress({ type: 'success', message: "Envoi vers GitHub réussi", step: "remote" });
                    } catch (gitError: any) {
                        console.error('GitHub API Error:', gitError);
                        const errorDetails = gitError.response?.data?.message || 'Unknown error';
                        const errorStatus = gitError.status || gitError.response?.status || 'Unknown status';
                        await sendProgress({ 
                            type: 'error', 
                            message: `Erreur GitHub: ${errorStatus} - ${errorDetails}. Vérifiez que le dépôt, la branche et les permissions sont corrects.`, 
                            step: "remote" 
                        });
                        throw gitError;
                    }
                } catch (error) {
                    console.error('Error uploading to GitHub:', error);
                    await sendProgress({ type: 'error', message: "Erreur lors de l'envoi vers GitHub", step: "remote" });
                    if (uploadMode === 'remote') {
                        return;
                    }
                }
            }

            await sendProgress({ type: 'success', message: "Traitement terminé avec succès", step: "complete" });
        } catch (e: any) {
            if (e instanceof z.ZodError) {
                const errors = e.errors.map((error) => {
                    return {
                        field: error.path.join("."),
                        message: error.message
                    }
                });

                await sendProgress({ type: 'error', message: "Échec de la validation", step: "validation" });
                for (const error of errors) {
                    await sendProgress({ type: 'error', message: `${error.field}: ${error.message}`, step: "validation" });
                }
            } else {
                await sendProgress({ type: 'error', message: "Une erreur inattendue s'est produite", step: "error" });
            }
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