import {Octokit} from "octokit";
import type {APIRoute} from "astro";

export const prerender = false;

function getOctokitClient() {
    const token = import.meta.env.GITHUB_TOKEN;
    console.log(token);
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

    console.log(existingFile);

    const message = `[fiche] ${existingFile ? "Mise à jour d’une fiche existante" : "Ajout d’une nouvelle fiche"} - ${file.name}`

    const response = await octokit.rest.repos.createOrUpdateFileContents({
        ...payload,
        path: filePath,
        message: message,
        content: Buffer.from(await file.arrayBuffer()).toString('base64'),
        branch: import.meta.env.GITHUB_BRANCH || "main",
        // @ts-ignore
        sha: existingFile?.data?.sha || undefined
    });

    if (response.status === 201) {

        return new Response(
            JSON.stringify({
                message: `Upload successful of ${file.name}`
            }), {
                status: 200
            });
    } else {
        return new Response(
            JSON.stringify({
                message: `Upload failed for ${file.name}`
            }), {
                status: response.status
            })
    }
}