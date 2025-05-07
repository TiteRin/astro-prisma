import matter from 'gray-matter';
import { z } from "zod";
import { summaryValidationSchema } from "@/content.config.js";
import type { SummaryData } from "@/content.config.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_EXTENSIONS = ['.md', '.mdx'];
const IMAGE_VALIDATION_TIMEOUT = 5000; // 5 seconds

export class FileValidator {
    static validateFileName(name: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        // Check file extension
        const extension = name.slice(name.lastIndexOf('.')).toLowerCase();
        if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
            errors.push(`L'extension du fichier doit être ${ALLOWED_FILE_EXTENSIONS.join(' ou ')}`);
        }

        // Check file name format (no special characters except - and _)
        if (!/^[a-zA-Z0-9-_]+\.(md|mdx)$/.test(name)) {
            errors.push('Le nom du fichier ne doit contenir que des lettres, chiffres, tirets et underscores');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static validateFileSize(size: number): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (size > MAX_FILE_SIZE) {
            errors.push(`La taille du fichier ne doit pas dépasser ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Function to extract image URLs from markdown content
    static extractImageUrls(content: string): string[] {
        // Match both markdown image syntax ![alt](url) and HTML img tags
        const imageRegex = /!\[.*?\]\((.*?)\)|<img[^>]+src="([^">]+)"/g;
        const urls: string[] = [];
        let match;

        while ((match = imageRegex.exec(content)) !== null) {
            // match[1] is for markdown syntax, match[2] is for HTML img tags
            const url = match[1] || match[2];
            if (url) {
                // Handle relative URLs
                if (url.startsWith('/')) {
                    urls.push(new URL(url, import.meta.env.SITE_URL).toString());
                } else {
                    urls.push(url);
                }
            }
        }

        return urls;
    }

    // Function to validate image URLs
    static async validateImageUrls(urls: string[]): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];
        
        // Parse domain lists from environment variables
        const allowedDomains = import.meta.env.ALLOWED_IMAGE_DOMAINS?.split(',').filter(Boolean) || [];
        const blockedDomains = import.meta.env.BLOCKED_IMAGE_DOMAINS?.split(',').filter(Boolean) || [];

        for (const url of urls) {
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

                // Try to fetch the image with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), IMAGE_VALIDATION_TIMEOUT);

                try {
                    const response = await fetch(url, { 
                        method: 'HEAD',
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        errors.push(`L'image "${url}" n'est pas accessible (code ${response.status})`);
                    }
                } catch (error: unknown) {
                    if (error instanceof Error && error.name === 'AbortError') {
                        errors.push(`La vérification de l'image "${url}" a pris trop de temps`);
                    } else {
                        errors.push(`Impossible de vérifier l'accessibilité de l'image "${url}"`);
                    }
                }
            } catch (error) {
                errors.push(`L'URL de l'image "${url}" n'est pas valide`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static async validateNote(file: File, contributor?: string): Promise<{ 
        valid: boolean; 
        data?: SummaryData; 
        content?: string;
        errors?: { field: string; message: string }[];
    }> {
        try {
            // Validate file name
            const nameValidation = this.validateFileName(file.name);
            if (!nameValidation.valid) {
                return {
                    valid: false,
                    errors: nameValidation.errors.map(error => ({
                        field: 'fileName',
                        message: error
                    }))
                };
            }

            // Validate file size
            const sizeValidation = this.validateFileSize(file.size);
            if (!sizeValidation.valid) {
                return {
                    valid: false,
                    errors: sizeValidation.errors.map(error => ({
                        field: 'fileSize',
                        message: error
                    }))
                };
            }

            const text = await file.text();
            const { data: attributes, content } = matter(text);

            if (Object.keys(attributes).length === 0) {
                return { 
                    valid: false, 
                    errors: [{ field: 'frontmatter', message: 'Aucune donnée dans le frontmatter' }]
                };
            }

            let processedAttributes = { ...attributes };

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

            const validationData = summaryValidationSchema.parse(processedAttributes);

            return {
                valid: true,
                data: validationData,
                content
            };
        } catch (e) {
            if (e instanceof z.ZodError) {
                return {
                    valid: false,
                    errors: e.errors.map(error => ({
                        field: error.path.join("."),
                        message: error.message
                    }))
                };
            }
            throw e;
        }
    }
} 