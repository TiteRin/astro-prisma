import { Octokit } from "octokit";
import type { SummaryData } from "@/content.config.js";

type GitHubPayload = {
    owner: string;
    repo: string;
};

export type TargetEnvironment = 'develop' | 'staging' | 'main';

type FileUpload = {
    path: string;
    content: Buffer | string;
};

type UploadMetadata = {
    title: string;
    contributor: string;
    lastModification: Date;
};

export class GitHubService {
    private octokit: Octokit;
    private payload: GitHubPayload;

    constructor() {
        const token = import.meta.env.GITHUB_TOKEN;
        const owner = import.meta.env.GITHUB_OWNER;
        const repo = import.meta.env.GITHUB_REPO;

        if (!token || !owner || !repo) {
            throw new Error('Missing required environment variables: GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_REPO');
        }

        this.octokit = new Octokit({ auth: token });
        this.payload = { owner, repo };
    }

    private determineTargetBranch(isDraft: boolean, env: string): string {
        if (isDraft) {
            return 'notes/upload-develop';
        }
        
        const targetEnv: TargetEnvironment = (() => {
            switch(env) {
                case 'production':
                    return 'main';
                case 'preview':
                    return 'staging';
                default:
                    return 'develop';
            }
        })();
        
        return `notes/upload-${targetEnv}`;
    }

    private determineBaseBranch(env: string): TargetEnvironment {
        switch(env) {
            case 'production':
                return 'main';
            case 'preview':
                return 'staging';
            default:
                return 'develop';
        }
    }

    private async syncBranchWithBase(branchName: string, baseBranch: string) {
        try {
            // Get the latest commit from base branch
            const baseRef = await this.octokit.rest.git.getRef({
                ...this.payload,
                ref: `heads/${baseBranch}`
            });
            const baseSha = baseRef.data.object.sha;

            try {
                // Try to get the current branch
                await this.octokit.rest.git.getRef({
                    ...this.payload,
                    ref: `heads/${branchName}`
                });

                // If branch exists, update it to match base
                await this.octokit.rest.git.updateRef({
                    ...this.payload,
                    ref: `heads/${branchName}`,
                    sha: baseSha,
                    force: true
                });
            } catch (error: any) {
                if (error.status === 404) {
                    // Branch doesn't exist, create it
                    await this.octokit.rest.git.createRef({
                        ...this.payload,
                        ref: `refs/heads/${branchName}`,
                        sha: baseSha
                    });
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error('Error syncing branch:', error);
            throw error;
        }
    }

    private validateFilePath(path: string): boolean {
        // Prevent directory traversal and ensure path is within allowed directories
        const normalizedPath = path.replace(/\\/g, '/');
        const allowedDirs = ['src/summaries', 'public/img'];
        return allowedDirs.some(dir => normalizedPath.startsWith(dir));
    }

    async uploadFiles(files: FileUpload[], isDraft: boolean, metadata: UploadMetadata) {
        // Validate file paths
        for (const file of files) {
            if (!this.validateFilePath(file.path)) {
                throw new Error(`Invalid file path: ${file.path}`);
            }
        }

        const targetBranch = this.determineTargetBranch(isDraft, import.meta.env.NODE_ENV || 'development');
        const baseBranch = this.determineBaseBranch(import.meta.env.NODE_ENV || 'development');

        // Sync branch
        await this.syncBranchWithBase(targetBranch, baseBranch);

        // Create blobs
        const blobs = await Promise.all(
            files.map(file => 
                this.octokit.rest.git.createBlob({
                    ...this.payload,
                    content: typeof file.content === 'string' 
                        ? Buffer.from(file.content).toString('base64')
                        : file.content.toString('base64'),
                    encoding: 'base64'
                })
            )
        );

        // Get latest commit SHA
        const { data: { object: { sha: latestCommitSha } } } = await this.octokit.rest.git.getRef({
            ...this.payload,
            ref: `heads/${targetBranch}`
        });

        // Get current tree using the commit SHA
        const { data: { sha: baseTree } } = await this.octokit.rest.git.getTree({
            ...this.payload,
            tree_sha: latestCommitSha,
            recursive: "true"
        });

        // Create new tree
        const { data: { sha: newTree } } = await this.octokit.rest.git.createTree({
            ...this.payload,
            base_tree: baseTree,
            tree: files.map((file, index) => ({
                path: file.path,
                mode: '100644',
                type: 'blob',
                sha: blobs[index].data.sha
            }))
        });

        // Get latest commit
        const { data: { object: { sha: parentCommit } } } = await this.octokit.rest.git.getRef({
            ...this.payload,
            ref: `heads/${targetBranch}`
        });

        // Create commit
        const { data: { sha: newCommit } } = await this.octokit.rest.git.createCommit({
            ...this.payload,
            message: `[fiche] ${metadata.title || 'Nouvelle fiche'}`,
            tree: newTree,
            parents: [parentCommit]
        });

        // Update reference
        await this.octokit.rest.git.updateRef({
            ...this.payload,
            ref: `heads/${targetBranch}`,
            sha: newCommit
        });

        // Create or update PR
        const prTitle = isDraft 
            ? `[Draft] ${metadata.title || 'Nouvelle fiche'}`
            : `[Note] ${metadata.title || 'Nouvelle fiche'}`;

        const prBody = `
Cette Pull Request a été créée automatiquement suite à l'ajout d'une nouvelle fiche.

${isDraft ? '⚠️ Cette fiche est en mode brouillon.' : '✅ Cette fiche est prête pour relecture.'}

### Détails
${Object.entries(metadata)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n')}
`;

        try {
            await this.octokit.rest.pulls.create({
                ...this.payload,
                title: prTitle,
                body: prBody,
                head: targetBranch,
                base: baseBranch,
                draft: isDraft
            });
            return { success: true, message: "Pull Request créée avec succès" };
        } catch (prError: any) {
            if (prError.status === 422) {
                return { success: true, message: "Une Pull Request existe déjà pour cette branche" };
            }
            throw prError;
        }
    }
} 