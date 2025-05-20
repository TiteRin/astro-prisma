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
import { UploadStatus } from "./types";

// Composant principal
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
    const [fileId, setFileId] = useState<string | null>(null);
    const [fileMetadata, setFileMetadata] = useState<FilePreview | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    // Gestion du changement de fichier de couverture
    const handleCoverChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setCoverFile(file);
        
        if (!file) {
            setCoverPreview(null);
            setFileValidation(prev => ({ ...prev, cover: { isValid: true } }));
            return;
        }

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
        
        if (!validationResult.isValid) {
            setCoverPreview(null);
            setUploadStatus({
                isUploading: false,
                message: validationResult.errors[0]?.message || "L'image n'est pas valide",
                type: 'error'
            });
            return;
        }
        
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
    };

    // Gestion du changement de fichier document
    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        
        if (!file) {
            return;
        }

        setDocumentFile(file);
        setFileId(null);
        setFileMetadata(null);  

        const validationResult = validateMarkdownFile(file);

        if (!validationResult.isValid) {
            setFileValidation(prev => ({ 
                ...prev, 
                file: { 
                    isValid: false, 
                    message: validationResult.errors[0]?.message 
                } 
            }));
            return;
        }

        try {
            const result = await silentUploadFile(file);

            if (!result.success || !result.id) {
                throw new Error("Erreur lors de l'upload du fichier");
            }

            const preview = await createFilePreview(file, result.frontmatter);
            setFileMetadata(preview);
            setFileId(result.id);
            
            // Notification de succès
            setUploadStatus({
                isUploading: false,
                message: "Fichier valide",
                type: 'success'
            });            
        }
        catch (error) {
            setUploadStatus({
                isUploading: false,
                message: `Erreur lors de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
                type: 'error'
            });
        }
        finally {
            setUploadStatus({
                isUploading: false,
                message: "Fichier valide",
                type: 'success'
            });
        }
    };

    // Réinitialisation du champ de fichier
    const handleResetFile = () => {
        setFileMetadata(null);
        setFileId(null);
        setDocumentFile(null);
        setFileValidation(prev => ({ ...prev, file: { isValid: true } }));
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
        <form 
            className="upload-form" 
            id="uploadForm" 
            ref={formRef} 
            onSubmit={handleSubmit}
            aria-labelledby="upload-form-title"
        >
            <h2 className="upload-form__title" id="upload-form-title">Ajouter une nouvelle fiche de lecture</h2>

            <StatusMessage message={uploadStatus.message} type={uploadStatus.type} />

            <ContributorField 
                value={contributor}
                onChange={setContributor}
            />
            
            <div className="upload-form__flex-wrapper">
                <CoverUpload 
                    coverPreview={coverPreview}
                    isValid={fileValidation.cover.isValid}
                    validationMessage={fileValidation.cover.message}
                    onChange={handleCoverChange}
                    disabled={uploadStatus.isUploading}
                />

                <FileUpload 
                    fileMetadata={fileMetadata}
                    fileId={fileId}
                    isValid={fileValidation.file.isValid}
                    validationMessage={fileValidation.file.message}
                    onChange={handleFileChange}
                    onReset={handleResetFile}
                    disabled={uploadStatus.isUploading}
                />
            </div>

            <div className="upload-form__submit">
                <button 
                    type="submit" 
                    className="btn-action with-border"
                    disabled={uploadStatus.isUploading}
                    aria-busy={uploadStatus.isUploading}
                >
                    {uploadStatus.isUploading ? 'Envoi en cours...' : 'Ajouter'}
                </button>
            </div>
        </form>
    );
}