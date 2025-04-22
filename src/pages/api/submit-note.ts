import {Octokit} from "octokit";
import type {APIRoute} from "astro";
import matter from 'gray-matter';
import {summaryValidationSchema} from "../../content.config.js";
import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';

export const prerender = false;

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

// Function to extract image URLs from markdown content
function extractImageUrls(content: string): string[] {
    // Match both markdown image syntax ![alt](url) and HTML img tags
    const imageRegex = /!\[.*?\]\((.*?)\)|<img[^>]+src="([^">]+)"/g;
    const urls: string[] = [];
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
        // match[1] is for markdown syntax, match[2] is for HTML img tags
        const url = match[1] || match[2];
        if (url) {
            urls.push(url);
        }
    }

    return urls;
}

// Function to validate image URLs
async function validateImageUrls(urls: string[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Parse domain lists from environment variables
    const allowedDomains = import.meta.env.ALLOWED_IMAGE_DOMAINS?.split(',').filter(Boolean) || [];
    const blockedDomains = import.meta.env.BLOCKED_IMAGE_DOMAINS?.split(',').filter(Boolean) || [];

    for (const url of urls) {
        // Check if URL is absolute
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            errors.push(`L'image "${url}" doit utiliser une URL absolue (commençant par http:// ou https://)`);
            continue;
        }

        try {
            const urlObj = new URL(url);
            
            // Check blocked domains first
            if (blockedDomains.length > 0 && blockedDomains.some((domain: string) => urlObj.hostname.includes(domain))) {
                errors.push(`Le domaine de l'image "${url}" est bloqué.`);
                continue;
            }

            // Check allowed domains if specified
            if (allowedDomains.length > 0 && !allowedDomains.some((domain: string) => urlObj.hostname.includes(domain))) {
                errors.push(`Le domaine de l'image "${url}" n'est pas dans la liste des domaines autorisés.`);
                continue;
            }

            // Try to fetch the image to verify it exists and is accessible
            const response = await fetch(url, { method: 'HEAD' });
            if (!response.ok) {
                errors.push(`L'image "${url}" n'est pas accessible (code ${response.status})`);
            }
        } catch (error) {
            errors.push(`Impossible de vérifier l'accessibilité de l'image "${url}"`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
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

    if (!file) {
        return new Response(
            JSON.stringify({
                message: "Missing file",
            }),
            {
                status: 400
            }
        )
    }

    if (!coverImage) {
        return new Response(
            JSON.stringify({
                message: "Missing cover image",
            }),
            {
                status: 400
            }
        )
    }

    // Read the file, and look for some keys in the frontmatter
    const text = await file.text();
    const { data: attributes, content: body } = matter(text);

    if (Object.keys(attributes).length === 0) {
        return new Response(
            JSON.stringify({
                message: "No frontmatter data"
            }),
            {
                status: 400
            }
        );
    }

    // Validate images in the markdown content
    const imageUrls = extractImageUrls(body);
    if (imageUrls.length > 0) {
        const validationResult = await validateImageUrls(imageUrls);
        if (!validationResult.valid) {
            return new Response(
                JSON.stringify({
                    message: "Image validation failed",
                    errors: validationResult.errors
                }),
                {
                    status: 400
                }
            );
        }
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

    try {
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
                // Save markdown file
                await saveFileLocally(filePath, fileContent);
                
                // Save cover image
                const coverImageContent = await coverImage.arrayBuffer();
                await saveFileLocally(coverImagePath, Buffer.from(coverImageContent));
            } catch (error) {
                console.error('Error saving files locally:', error);
                if (uploadMode === 'local') {
                    throw error;
                }
            }
        }

        // Handle remote upload if needed
        if (uploadMode === 'remote' || uploadMode === 'both') {
            try {
                // Get the current tree SHA
                const { data: { sha: baseTree } } = await octokit.rest.git.getTree({
                    ...payload,
                    tree_sha: import.meta.env.GITHUB_BRANCH || "main",
                    recursive: "true"
                });

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
                    ref: `heads/${import.meta.env.GITHUB_BRANCH || "main"}`
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
                    ref: `heads/${import.meta.env.GITHUB_BRANCH || "main"}`,
                    sha: newCommit
                });
            } catch (error) {
                console.error('Error uploading to GitHub:', error);
                if (uploadMode === 'remote') {
                    throw error;
                }
            }
        }

        return new Response(
            JSON.stringify({
                message: `Upload successful of ${file.name}`,
                addedFields: {
                    contributor: !attributes.contributor,
                    lastModification: !attributes.lastModification
                }
            }), {
                status: 200
            });
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            const errors = e.errors.map((error) => {
                return {
                    field: error.path.join("."),
                    message: error.message
                }
            });

            return new Response(JSON.stringify({
                message: "Validation failed",
                errors
            }), {
                status: 400
            })
        }

        throw e;
    }
}