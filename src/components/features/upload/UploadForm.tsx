import React, { useState, useRef, ChangeEvent, FormEvent } from "react";
import "../../../styles/features/upload/index.scss";
import { 
    validateImage, 
    validateMarkdownFile, 
    createImagePreview, 
    createFilePreview,
    submitUploadForm,
    UploadProgress,
    silentUploadFile,
    FilePreview
} from "../../../utils/uploadService";

// Import des composants
import StatusMessage from "./StatusMessage";
import ContributorField from "./ContributorField";
import CoverUpload from "./CoverUpload";
import FileUpload from "./FileUpload";
import { FormState } from "./types";

// État initial du formulaire
const initialFormState: FormState = {
    contributor: "",
    cover: {
        file: null,
        preview: null,
        validation: { isValid: true }
    },
    document: {
        file: null,
        preview: null,
        metadata: null,
        id: null,
        validation: { isValid: true }
    },
    status: { isUploading: false }
};

// Composant principal
export default function UploadForm() {
    const [formState, setFormState] = useState<FormState>(initialFormState);
    const formRef = useRef<HTMLFormElement>(null);

    // Mise à jour du contributeur
    const handleContributorChange = (contributor: string) => {
        setFormState(prev => ({
            ...prev,
            contributor
        }));
    };

    // Mise à jour du statut
    const updateStatus = (status: typeof formState.status) => {
        setFormState(prev => ({
            ...prev,
            status
        }));
    };

    // Gestion du changement de fichier de couverture
    const handleCoverChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        
        if (!file) {
            // Réinitialiser l'état de couverture
            setFormState(prev => ({
                ...prev,
                cover: {
                    ...prev.cover,
                    file: null,
                    preview: null,
                    validation: { isValid: true }
                }
            }));
            return;
        }

        // Mise à jour du fichier
        setFormState(prev => ({
            ...prev,
            cover: {
                ...prev.cover,
                file
            }
        }));

        // Validation du fichier
        const validationResult = validateImage(file);
        const validation = {
            isValid: validationResult.isValid,
            message: validationResult.errors[0]?.message
        };
        
        // Mise à jour de l'état de validation
        setFormState(prev => ({
            ...prev,
            cover: {
                ...prev.cover,
                validation
            }
        }));
        
        if (!validationResult.isValid) {
            setFormState(prev => ({
                ...prev,
                cover: {
                    ...prev.cover,
                    preview: null
                },
                status: {
                    isUploading: false,
                    message: validationResult.errors[0]?.message || "L'image n'est pas valide",
                    type: 'error'
                }
            }));
            return;
        }
        
        try {
            // Création de l'aperçu
            const preview = await createImagePreview(file);
            
            // Mise à jour de l'état avec le nouvel aperçu
            setFormState(prev => ({
                ...prev,
                cover: {
                    ...prev.cover,
                    preview
                },
                status: {
                    isUploading: false,
                    message: "Image valide",
                    type: 'success'
                }
            }));
            
            // Effacer le message après 3 secondes
            setTimeout(() => {
                updateStatus({ isUploading: false });
            }, 3000);
        } catch (error) {
            console.error("Error creating preview:", error);
            updateStatus({
                isUploading: false,
                message: "Erreur lors de la création de l'aperçu",
                type: 'error'
            });
        }
    };

    // Gestion du changement de fichier document
    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        
        if (!file) {
            return;
        }

        // Mise à jour initiale du fichier
        setFormState(prev => ({
            ...prev,
            document: {
                ...prev.document,
                file,
                id: null,
                metadata: null
            }
        }));

        const validationResult = validateMarkdownFile(file);
        const validation = {
            isValid: validationResult.isValid,
            message: validationResult.errors[0]?.message
        };

        if (!validationResult.isValid) {
            setFormState(prev => ({
                ...prev,
                document: {
                    ...prev.document,
                    validation
                }
            }));
            return;
        }

        try {
            const result = await silentUploadFile(file);

            if (!result.success || !result.id) {
                throw new Error("Erreur lors de l'upload du fichier");
            }

            const metadata = await createFilePreview(file, result.frontmatter);
            
            // Mise à jour avec les métadonnées et l'ID
            setFormState(prev => ({
                ...prev,
                document: {
                    ...prev.document,
                    id: result.id,
                    metadata,
                    validation
                },
                status: {
                    isUploading: false,
                    message: "Fichier valide",
                    type: 'success'
                }
            }));
        }
        catch (error) {
            updateStatus({
                isUploading: false,
                message: `Erreur lors de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
                type: 'error'
            });
        }
    };

    // Réinitialisation du champ de fichier
    const handleResetFile = () => {
        setFormState(prev => ({
            ...prev,
            document: {
                ...prev.document,
                file: null,
                id: null,
                metadata: null,
                validation: { isValid: true }
            }
        }));
    };

    // Gestion des messages de progression
    const handleUploadProgress = (progress: UploadProgress) => {
        updateStatus({
            isUploading: progress.step !== 'complete' && progress.step !== 'error',
            message: progress.message,
            type: progress.type
        });
        
        // Si l'upload est terminé avec succès, reset le formulaire
        if (progress.step === 'complete' && progress.type === 'success') {
            setTimeout(() => {
                formRef.current?.reset();
                setFormState(initialFormState);
            }, 3000);
        }
    };

    // Soumission du formulaire
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const { contributor, cover, document } = formState;
        
        // Vérification que tous les champs sont valides
        if (!contributor.trim()) {
            updateStatus({
                isUploading: false,
                message: "Veuillez entrer votre nom",
                type: 'error'
            });
            return;
        }
        
        if (!cover.file || !cover.validation.isValid) {
            updateStatus({
                isUploading: false,
                message: cover.validation.message || "L'image de couverture n'est pas valide",
                type: 'error'
            });
            return;
        }
        
        if (!document.file || !document.validation.isValid) {
            updateStatus({
                isUploading: false,
                message: document.validation.message || "Le fichier n'est pas valide",
                type: 'error'
            });
            return;
        }
        
        // Si tout est valide, soumettre le formulaire
        updateStatus({
            isUploading: true,
            message: "Envoi en cours...",
            type: 'info'
        });
        
        try {
            // Créer un FormData pour envoyer les fichiers
            const formData = new FormData();
            formData.append('contributor', contributor);
            formData.append('cover-image', cover.file);
            formData.append('new-note', document.file);
            
            // Soumettre le formulaire via notre service
            await submitUploadForm(formData, handleUploadProgress);
            
        } catch (error) {
            console.error("Error submitting form:", error);
            updateStatus({
                isUploading: false,
                message: `Erreur lors de l'envoi: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
                type: 'error'
            });
        }
    };

    const { contributor, cover, document, status } = formState;

    return (
        <form 
            className="upload-form" 
            id="uploadForm" 
            ref={formRef} 
            onSubmit={handleSubmit}
            aria-labelledby="upload-form-title"
        >
            <h2 className="upload-form__title" id="upload-form-title">Ajouter une nouvelle fiche de lecture</h2>

            <StatusMessage message={status.message} type={status.type} />

            <ContributorField 
                value={contributor}
                onChange={handleContributorChange}
            />
            
            <div className="upload-form__flex-wrapper">
                <CoverUpload 
                    coverPreview={cover.preview}
                    isValid={cover.validation.isValid}
                    validationMessage={cover.validation.message}
                    onChange={handleCoverChange}
                    disabled={status.isUploading}
                />

                <FileUpload 
                    fileMetadata={document.metadata || null}
                    fileId={document.id || null}
                    isValid={document.validation.isValid}
                    validationMessage={document.validation.message}
                    onChange={handleFileChange}
                    onReset={handleResetFile}
                    disabled={status.isUploading}
                />
            </div>

            <div className="upload-form__submit">
                <button 
                    type="submit" 
                    className="btn-action with-border"
                    disabled={status.isUploading}
                    aria-busy={status.isUploading}
                >
                    {status.isUploading ? 'Envoi en cours...' : 'Ajouter'}
                </button>
            </div>
        </form>
    );
}