import React, { useState, useCallback, useEffect } from 'react';
import { FilePreview, validateMarkdownFile, createFilePreview, silentUploadFile } from '@/utils/uploadService';
import { truncateText } from '@/utils/stringUtils';

export interface FileUploadProps {
    value?: File | null;
    onChange?: (file: File | null, metadata: FilePreview | null, fileId: string | null) => void;
    onError?: (error: string) => void;
    disabled?: boolean;
    className?: string;
    allowedTypes?: string[];
}

const FilePreviewDisplay = ({ 
    fileMetadata,
    isLoading,
    onAddClick,
    onResetClick,
    disabled
}: { 
    fileMetadata: FilePreview | null;
    isLoading: boolean;
    onAddClick: () => void;
    onResetClick: () => void;
    disabled: boolean;
}) => { 
    return (
        <div className="relative w-full min-h-[200px] bg-base-200 rounded-lg overflow-hidden">
            {/* Preview Content */}
            <div className="p-4">
                <ul className="space-y-2">
                    <li><strong>Titre:</strong> {fileMetadata?.title || '-'}</li>
                    <li><strong>Auteurs:</strong> {fileMetadata?.authors?.join(', ') || '-'}</li>
                    <li><strong>Tags:</strong> {fileMetadata?.tags?.join(', ') || '-'}</li>
                    <li><strong>Description:</strong> {fileMetadata?.description ? truncateText(fileMetadata.description) : '-'}</li>
                </ul>
            </div>

            {/* Overlay */}
            <div className={`absolute inset-0 flex items-center justify-center bg-base-300/50 transition-opacity ${
                fileMetadata ? 'opacity-0 hover:opacity-100' : 'opacity-100'
            }`}>
                <div className="text-center">
                    {isLoading ? (
                        <div className="space-y-2">
                            <div className="loading loading-spinner loading-lg"></div>
                            <p className="text-base-content font-medium">Vérification en cours...</p>
                            <progress className="progress w-56"></progress>
                        </div>
                    ) : (
                        <button 
                            type="button" 
                            className="btn btn-primary"
                            onClick={fileMetadata ? onResetClick : onAddClick}
                            disabled={disabled}
                        >
                            {fileMetadata ? 'Changer de fichier' : 'Ajouter un fichier'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const FileUpload = ({ 
    value,
    onChange,
    onError,
    disabled = false,
    className = '',
    allowedTypes = ['.md', '.mdx']
}: FileUploadProps) => {
    const [fileMetadata, setFileMetadata] = useState<FilePreview | null>(null);
    const [fileId, setFileId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [inputKey, setInputKey] = useState(0); // Pour réinitialiser l'input

    // Réinitialiser l'état quand value change
    useEffect(() => {
        if (!value) {
            setFileMetadata(null);
            setFileId(null);
        }
    }, [value]);

    const validateFile = useCallback(async (file: File): Promise<boolean> => {
        // Validation client
        const validationResult = validateMarkdownFile(file);
        if (!validationResult.isValid) {
            onError?.(validationResult.errors[0]?.message || "Le fichier n'est pas valide");
            return false;
        }

        try {
            // Validation serveur
            setIsLoading(true);
            const result = await silentUploadFile(file);

            if (!result.success) {
                if (result.errors && result.errors.length > 0) {
                    throw new Error(result.errors[0]);
                } else {
                    throw new Error("Erreur lors de la validation du fichier");
                }
            }

            if (!result.id) {
                throw new Error("L'ID du fichier est manquant après validation");
            }

            // Création de l'aperçu avec les métadonnées
            const metadata = await createFilePreview(file, result.frontmatter);
            setFileMetadata(metadata);
            setFileId(result.id);
            onChange?.(file, metadata, result.id);
            return true;
        } catch (error) {
            onError?.(error instanceof Error ? error.message : "Erreur inconnue");
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [onChange, onError]);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        
        if (!file) {
            onChange?.(null, null, null);
            return;
        }

        await validateFile(file);
    }, [onChange, validateFile]);

    const handleAddClick = useCallback(() => {
        document.getElementById('file-upload')?.click();
    }, []);

    const handleResetClick = useCallback(() => {
        setFileMetadata(null);
        setFileId(null);
        onChange?.(null, null, null);
        setInputKey(prev => prev + 1); // Force la réinitialisation de l'input
    }, [onChange]);

    return (
        <div className={className}>
            <FilePreviewDisplay 
                fileMetadata={fileMetadata}
                isLoading={isLoading}
                onAddClick={handleAddClick}
                onResetClick={handleResetClick}
                disabled={disabled}
            />
            <input 
                key={inputKey}
                type="file" 
                id="file-upload" 
                name="file-upload" 
                required 
                className="hidden"
                accept={allowedTypes.join(',')}
                onChange={handleFileChange}
                disabled={disabled}
                aria-describedby="file-desc"
            />
            <span id="file-desc" className="sr-only">Sélectionnez un fichier Markdown pour votre fiche de lecture</span>
        </div>
    );
};

export default FileUpload; 