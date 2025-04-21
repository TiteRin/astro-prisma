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
        const validationData = summaryValidationSchema.parse(processedAttributes);

        const fileContent = matter.stringify(body, processedAttributes);

        // Does the file exists?
        const filePath = `src/summaries/${file.name}`;
        let existingFile = null;
        try {
            existingFile = await octokit.rest.repos.getContent({
                ...payload,
                path: filePath,
                ref: import.meta.env.GITHUB_BRANCH || "main"
            });
        } catch (e: any) {
            if (e.status !== 404) {
                throw e;
            }
        }

        const message = `[fiche] ${existingFile ? "Mise à jour d'une fiche existante" : "Ajout d'une nouvelle fiche"} - ${file.name}`;

        const response = await octokit.rest.repos.createOrUpdateFileContents({
            ...payload,
            path: filePath,
            message: message,
            content: Buffer.from(fileContent).toString('base64'),
            branch: import.meta.env.GITHUB_BRANCH || "main",
            // @ts-ignore
            sha: existingFile?.data?.sha || undefined
        });

        if (response.status === 201) {
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
        } else {
            return new Response(
                JSON.stringify({
                    message: `Upload failed for ${file.name}`
                }), {
                    status: response.status
                });
        }
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