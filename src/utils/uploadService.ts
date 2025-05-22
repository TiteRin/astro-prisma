// Types pour la validation des fichiers
export interface FileValidationError {
    field: string;
    message: string;
}

export interface FileValidationResult {
    isValid: boolean;
    errors: FileValidationError[];
}

export interface UploadProgress {
    type: 'info' | 'success' | 'error' | 'warning';
    message: string;
    step: string;
}

// Types pour la prévisualisation des fichiers
export interface FilePreview {
    name: string;
    size: number;
    title?: string;
    authors?: string[];
    tags?: string[];
    description?: string;
}

// Interface pour le résultat de l'upload silencieux
export interface SilentUploadResult {
    success: boolean;
    id?: string;
    frontmatter?: Record<string, any>;
    errors?: string[];
    frontmatterErrors?: string[];
    imageErrors?: string[];
}

// Schéma de validation pour les images
const imageValidationSchema = {
    maxSize: 2 * 1024 * 1024, // 2 MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
};

// Schéma de validation pour les fichiers markdown
const markdownValidationSchema = {
    maxSize: 5 * 1024 * 1024, // 5 MB
    allowedExtensions: ['.md', '.mdx'],
};

/**
 * Valide un fichier image
 * @param file Fichier à valider
 * @returns Résultat de la validation
 */
export function validateImage(file: File): FileValidationResult {
    const errors: FileValidationError[] = [];

    if (!file) {
        errors.push({
            field: 'cover',
            message: 'Veuillez sélectionner une image'
        });
        return { isValid: false, errors };
    }

    // Vérification du type de fichier
    if (!imageValidationSchema.allowedTypes.includes(file.type)) {
        errors.push({
            field: 'cover',
            message: 'Format d\'image non supporté. Utilisez JPG, PNG, GIF ou WebP'
        });
    }

    // Vérification de la taille
    if (file.size > imageValidationSchema.maxSize) {
        errors.push({
            field: 'cover',
            message: `La taille de l'image ne doit pas dépasser ${imageValidationSchema.maxSize / (1024 * 1024)} Mo`
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Valide un fichier markdown
 * @param file Fichier à valider
 * @returns Résultat de la validation
 */
export function validateMarkdownFile(file: File): FileValidationResult {
    const errors: FileValidationError[] = [];

    if (!file) {
        errors.push({
            field: 'file',
            message: 'Veuillez sélectionner un fichier'
        });
        return { isValid: false, errors };
    }

    // Vérification de l'extension
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!markdownValidationSchema.allowedExtensions.includes(extension)) {
        errors.push({
            field: 'file',
            message: 'Format de fichier non supporté. Utilisez .md ou .mdx'
        });
    }

    // Vérification de la taille
    if (file.size > markdownValidationSchema.maxSize) {
        errors.push({
            field: 'file',
            message: `La taille du fichier ne doit pas dépasser ${markdownValidationSchema.maxSize / (1024 * 1024)} Mo`
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Crée une prévisualisation du fichier
 * @param file Fichier à prévisualiser
 * @param metadata Métadonnées optionnelles extraites du frontmatter
 * @returns Promesse avec la prévisualisation
 */
export function createFilePreview(file: File, metadata?: Record<string, any>): Promise<FilePreview> {
    return new Promise((resolve, reject) => {
        try {
            const preview: FilePreview = {
                name: file.name,
                size: file.size,
                // Utiliser les métadonnées si disponibles, sinon définir comme undefined
                title: metadata?.title || metadata?.bookTitle,
                authors: metadata?.authors || metadata?.bookAuthors,
                tags: metadata?.tags,
                description: metadata?.summary || metadata?.description
            };
            resolve(preview);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Crée une prévisualisation d'une image
 * @param file Fichier image à prévisualiser
 * @returns Promesse avec l'URL de prévisualisation
 */
export function createImagePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                resolve(e.target.result as string);
            } else {
                reject(new Error("Échec de la création de la prévisualisation"));
            }
        };
        reader.onerror = (e) => {
            reject(e);
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Envoie silencieusement un fichier vers le serveur et récupère les métadonnées du frontmatter
 * @param file Fichier à envoyer
 * @returns Promesse avec le résultat de l'upload
 */
export async function silentUploadFile(file: File): Promise<SilentUploadResult> {
    try {
        // Créer un objet FormData avec le fichier
        const formData = new FormData();
        formData.append('file', file);

        // Envoyer le fichier à l'API d'upload temporaire
        const response = await fetch('/api/upload-temp', {
            method: 'POST',
            body: formData
        });

        // Récupérer les données de la réponse
        const result = await response.json() as SilentUploadResult;
        
        return result;
    } catch (error) {
        console.error('Erreur lors de l\'upload silencieux:', error);
        return {
            success: false,
            errors: [error instanceof Error ? error.message : 'Erreur inconnue']
        };
    }
}

/**
 * Récupère les informations d'un fichier temporaire par son ID
 * @param fileId ID du fichier temporaire
 * @returns Promesse avec le résultat
 */
export async function getTempFileInfo(fileId: string): Promise<SilentUploadResult> {
    try {
        const response = await fetch(`/api/upload-temp?id=${fileId}`);
        const result = await response.json() as SilentUploadResult;
        
        return result;
    } catch (error) {
        console.error('Erreur lors de la récupération des informations du fichier:', error);
        return {
            success: false,
            errors: [error instanceof Error ? error.message : 'Erreur inconnue']
        };
    }
}

/**
 * Envoie les données du formulaires pour créer une nouvelle note
 * 
 * @param formData Données du formulaire
 * @param onProgress Callback pour les notifications de progression
 * @returns Promesse avec le résultat de l'upload
 */
export async function submitUploadForm(
    formData: FormData,
    onProgress?: (progress: UploadProgress) => void
): Promise<boolean> {
    try {
        // Notifier le début du processus
        onProgress?.({
            type: 'info',
            message: 'Début du traitement...',
            step: 'start'
        });

        const response = await fetch('/api/create-note', 
            {
                method: 'POST',
                body: formData
            }
        )

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        // Lire le stream de notifications
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Aucun lecteur disponible');
        }

        let success = true;

        // Lire les notifications de progression
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = new TextDecoder().decode(value);
            const notifications = text.split('\n').filter(Boolean);

            for (const notification of notifications) {
                try {
                    const progress = JSON.parse(notification) as UploadProgress;
                    onProgress?.(progress);

                    // Si on reçoit une erreur, marquer l'upload comme échoué
                    if (progress.type === 'error') {
                        success = false;
                    }
                } catch (e) {
                    console.error('Erreur lors de l\'analyse de la notification:', e);
                }
            }
        }

        return success;
    } catch (error) {
        // Notifier l'erreur
        onProgress?.({
            type: 'error',
            message: error instanceof Error ? error.message : 'Erreur inconnue lors de l\'upload',
            step: 'error'
        });
        return false;
    }
} 