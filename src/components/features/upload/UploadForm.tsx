import { useState, useRef, ChangeEvent, FormEvent } from "react";
import "../../../styles/features/upload/index.scss";
import { 
    validateImage, 
    validateMarkdownFile, 
    createImagePreview, 
    createFilePreview,
    submitUploadForm,
    FileValidationResult as ValidationResult,
    FilePreview,
    UploadProgress
} from "../../../utils/uploadService";

interface UploadStatus {
    isUploading: boolean;
    message?: string;
    type?: 'success' | 'error' | 'info' | 'warning';
}

export default function UploadForm() {
    const [contributor, setContributor] = useState<string>("");
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [fileValidation, setFileValidation] = useState<Record<string, { isValid: boolean, message?: string }>>({
        cover: { isValid: true },
        file: { isValid: true }
    });
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ isUploading: false });
    const [fileMetadata, setFileMetadata] = useState<FilePreview | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    /**
     * TODO:
     * - Validate and upload files on the server at change
     * - Show preview of the cover 
     * - Show metadata of the file
     */

    // Gestion du changement de fichier de couverture
    const handleCoverChange = async (e: ChangeEvent<HTMLInputElement>) => {

        const file = e.target.files?.[0] || null;
        setCoverFile(file);
        
        if (file) {
            // Validation du fichier
            const validationResult = validateImage(file);
            
            // Mise à jour de l'état de validation
            setFileValidation(prev => ({ 
                ...prev, 
                cover: { 
                    isValid: validationResult.isValid, 
                    message: validationResult.errors[0]?.message 
                } 
            }));
            
            if (validationResult.isValid) {
                try {
                    // Création de l'aperçu
                    const previewUrl = await createImagePreview(file);
                    setCoverPreview(previewUrl);
                    
                    // Notification de succès
                    setUploadStatus({
                        isUploading: false,
                        message: "Image valide",
                        type: 'success'
                    });
                    
                    // Effacer le message après 3 secondes
                    setTimeout(() => {
                        setUploadStatus({ isUploading: false });
                    }, 3000);
                } catch (error) {
                    console.error("Error creating preview:", error);
                    setUploadStatus({
                        isUploading: false,
                        message: "Erreur lors de la création de l'aperçu",
                        type: 'error'
                    });
                }
            } else {
                // Notification d'erreur
                setUploadStatus({
                    isUploading: false,
                    message: validationResult.errors[0]?.message || "L'image n'est pas valide",
                    type: 'error'
                });
                setCoverPreview(null);
            }
        } else {
            setCoverPreview(null);
            setFileValidation(prev => ({ ...prev, cover: { isValid: true } }));
        }
    };

    // Gestion du changement de fichier document
    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setDocumentFile(file);
        
        if (file) {
            // Validation du fichier
            const validationResult = validateMarkdownFile(file);
            
            // Mise à jour de l'état de validation
            setFileValidation(prev => ({ 
                ...prev, 
                file: { 
                    isValid: validationResult.isValid, 
                    message: validationResult.errors[0]?.message 
                } 
            }));
            
            if (validationResult.isValid) {
                try {
                    // Affichage des métadonnées
                    const preview = await createFilePreview(file);
                    setFileMetadata(preview);
                    
                    // Notification de succès
                    setUploadStatus({
                        isUploading: false,
                        message: "Fichier valide",
                        type: 'success'
                    });
                    
                    // Effacer le message après 3 secondes
                    setTimeout(() => {
                        setUploadStatus({ isUploading: false });
                    }, 3000);
                } catch (error) {
                    console.error("Error creating file preview:", error);
                    setUploadStatus({
                        isUploading: false,
                        message: "Erreur lors de la création des métadonnées",
                        type: 'error'
                    });
                }
            } else {
                // Notification d'erreur
                setUploadStatus({
                    isUploading: false,
                    message: validationResult.errors[0]?.message || "Le fichier n'est pas valide",
                    type: 'error'
                });
                setFileMetadata(null);
            }
        } else {
            setFileMetadata(null);
            setFileValidation(prev => ({ ...prev, file: { isValid: true } }));
        }
    };

    // Gestion des messages de progression
    const handleUploadProgress = (progress: UploadProgress) => {
        setUploadStatus({
            isUploading: progress.step !== 'complete' && progress.step !== 'error',
            message: progress.message,
            type: progress.type
        });
        
        // Si l'upload est terminé avec succès, reset le formulaire
        if (progress.step === 'complete' && progress.type === 'success') {
            setTimeout(() => {
                formRef.current?.reset();
                setCoverFile(null);
                setDocumentFile(null);
                setCoverPreview(null);
                setFileMetadata(null);
                setContributor("");
                setUploadStatus({ isUploading: false });
            }, 3000);
        }
    };

    // Soumission du formulaire
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        // Vérification que tous les champs sont valides
        if (!contributor.trim()) {
            setUploadStatus({
                isUploading: false,
                message: "Veuillez entrer votre nom",
                type: 'error'
            });
            return;
        }
        
        if (!coverFile || !fileValidation.cover.isValid) {
            setUploadStatus({
                isUploading: false,
                message: fileValidation.cover.message || "L'image de couverture n'est pas valide",
                type: 'error'
            });
            return;
        }
        
        if (!documentFile || !fileValidation.file.isValid) {
            setUploadStatus({
                isUploading: false,
                message: fileValidation.file.message || "Le fichier n'est pas valide",
                type: 'error'
            });
            return;
        }
        
        // Si tout est valide, soumettre le formulaire
        setUploadStatus({
            isUploading: true,
            message: "Envoi en cours...",
            type: 'info'
        });
        
        try {
            // Créer un FormData pour envoyer les fichiers
            const formData = new FormData();
            formData.append('contributor', contributor);
            formData.append('cover-image', coverFile);
            formData.append('new-note', documentFile);
            
            // Soumettre le formulaire via notre service
            await submitUploadForm(formData, handleUploadProgress);
            
        } catch (error) {
            console.error("Error submitting form:", error);
            setUploadStatus({
                isUploading: false,
                message: `Erreur lors de l'envoi: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
                type: 'error'
            });
        }
    };

    return (
        <form className="upload-form" id="uploadForm" ref={formRef} onSubmit={handleSubmit}>
            <h2 className="upload-form__title">Ajouter une nouvelle fiche de lecture</h2>

            {/* Message d'état */}
            {uploadStatus.message && (
                <div className={`upload-form__status upload-form__status--${uploadStatus.type}`}>
                    {uploadStatus.message}
                </div>
            )}

            <div className="upload-form__field">
                <label htmlFor="contributor">Votre nom</label>
                <input 
                    type="text" 
                    id="contributor" 
                    name="contributor" 
                    required 
                    placeholder="Entrez votre nom" 
                    value={contributor}
                    onChange={(e) => setContributor(e.target.value)}
                />
            </div>
            
            <div className="upload-form__flex-wrapper">
                <div className="upload-form__cover-upload upload-form__field">
                    <label htmlFor="cover">Couverture</label>
                    <label htmlFor="cover" className={fileValidation.cover.isValid ? '' : 'invalid'}>
                        <img 
                            src={coverPreview || "https://placehold.co/200x300"} 
                            alt="Ajouter une couverture" 
                            aria-label="Ajouter une couverture"
                        />
                        {!fileValidation.cover.isValid && (
                            <div className="upload-form__validation-error">
                                {fileValidation.cover.message}
                            </div>
                        )}
                    </label>
                    <input 
                        type="file" 
                        id="cover" 
                        name="cover-image" 
                        required 
                        className="hidden"
                        accept="image/*"
                        onChange={handleCoverChange}
                    />
                </div>

                <div className="upload-form__file-upload upload-form__field">
                    <label htmlFor="file">Fichier</label>
                    <input 
                        type="file" 
                        id="file" 
                        name="new-note" 
                        required
                        accept=".md,.mdx"
                        onChange={handleFileChange}
                    />
                    {!fileValidation.file.isValid && (
                        <div className="upload-form__validation-error">
                            {fileValidation.file.message}
                        </div>
                    )}
                    
                    {/* Affichage des métadonnées du fichier */}
                    {fileMetadata && fileValidation.file.isValid && (
                        <div className="upload-form__file-preview">
                            <h4>Métadonnées du fichier</h4>
                            <ul>
                                <li><strong>Nom:</strong> {fileMetadata.name}</li>
                                <li><strong>Type:</strong> {fileMetadata.type}</li>
                                <li><strong>Taille:</strong> {Math.round(fileMetadata.size / 1024)} Ko</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="upload-form__submit">
                <button 
                    type="submit" 
                    className="btn-action with-border"
                    disabled={uploadStatus.isUploading}
                >
                    {uploadStatus.isUploading ? 'Envoi en cours...' : 'Ajouter'}
                </button>
            </div>
        </form>
    );
}