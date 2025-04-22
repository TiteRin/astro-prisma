import {Octokit} from "octokit";
import type {APIRoute} from "astro";
import matter from 'gray-matter';
import {summaryValidationSchema} from "../../content.config.js";
import { z } from "zod";

export const prerender = false;

function getOctokitClient() {
    const token = import.meta.env.GITHUB_TOKEN;
    return new Octokit({auth: token});
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
        // Prepare both files for the commit
        const coverImageName = `${file.name.replace(/\.(md|mdx)$/, '')}.${coverImage.name.split('.').pop()}`;
        const coverImagePath = `public/img/${coverImageName}`;
        const filePath = `src/summaries/${file.name}`;

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

        // Update the image URL in the frontmatter
        processedAttributes.image = {
            url: `/img/${coverImageName}`,
            alt: processedAttributes.image?.alt || `Couverture de ${processedAttributes.bookTitle}`
        };

        const validationData = summaryValidationSchema.parse(processedAttributes);
        const fileContent = matter.stringify(body, processedAttributes);
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