import { useState, useRef, FormEvent } from "react";
import { 
    validateImage, 
    createImagePreview, 
    submitUploadForm,
    UploadProgress,
} from "@/utils/uploadService";

// Import des composants
import ContributorField from "./ContributorField";
import CoverUpload from "./CoverUpload";
import FileUpload from "./FileUpload";
import UploadProgressModal from "./UploadProgressModal";
import { useUploadProgress } from "./useUploadProgress";
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
    
    // Hook pour gérer la progression de l'upload
    const uploadProgress = useUploadProgress();

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
    const handleCoverChange = async (file: File | null) => {
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
        
        // Vérification que tous les champs sont renseignés et valides
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
        
        // Pour le document, on vérifie simplement qu'il a été validé avec succès
        if (!document.file || !document.validation.isValid || !document.id) {
            updateStatus({
                isUploading: false,
                message: document.validation.message || "Le fichier n'est pas valide ou n'a pas été validé",
                type: 'error'
            });
            return;
        }
        
        // Ouvrir le modal de progression
        uploadProgress.openModal();
        
        try {
            // Créer un FormData pour envoyer les fichiers
            const formData = new FormData();
            formData.append('contributor', contributor);
            formData.append('cover-image', cover.file);
            formData.append('new-note', document.file);
            formData.append('file-id', document.id);
            
            // Soumettre le formulaire via notre service avec gestion de progression
            await submitUploadForm(formData, (progress: UploadProgress) => {
                console.log('Progress received:', progress); // Debug
                
                switch (progress.step) {
                    case 'validation':
                        if (progress.type === 'info' && progress.message.includes('en cours')) {
                            uploadProgress.startValidation();
                        } else if (progress.type === 'success') {
                            uploadProgress.completeValidation();
                        } else if (progress.type === 'error') {
                            uploadProgress.setStepError('validation', progress.message);
                        }
                        break;
                        
                    case 'envoi':
                        if (progress.type === 'info') {
                            // Démarrer l'envoi si ce n'est pas déjà fait
                            if (!uploadProgress.steps.find(s => s.id === 'envoi' && s.status === 'progress')) {
                                uploadProgress.startEnvoi();
                            }
                            // Mettre à jour le message spécifique (couverture ou fiche)
                            uploadProgress.updateStep('envoi', 'progress', progress.message);
                        } else if (progress.type === 'success') {
                            // Si c'est le dernier message de succès pour l'envoi, marquer comme terminé
                            if (progress.message.includes('fiche de lecture')) {
                                uploadProgress.completeEnvoi();
                            } else {
                                // Sinon, juste mettre à jour le message
                                uploadProgress.updateStep('envoi', 'progress', progress.message);
                            }
                        } else if (progress.type === 'error') {
                            uploadProgress.setStepError('envoi', progress.message);
                        }
                        break;
                        
                    case 'build':
                        if (progress.type === 'info' && progress.message.includes('Déclenchement')) {
                            uploadProgress.startBuild();
                        } else if (progress.type === 'info') {
                            // Mise à jour du message de build en cours
                            uploadProgress.updateBuildProgress(progress.message);
                        } else if (progress.type === 'success') {
                            // Extraire l'URL de déploiement et le slug du message
                            const deployUrlMatch = progress.message.match(/\(URL: (https?:\/\/[^)]+)\)/);
                            const deployUrl = deployUrlMatch ? deployUrlMatch[1] : window.location.origin;
                            
                            // Extraire le slug du message (format: "slug: mon-slug")
                            const slugMatch = progress.message.match(/slug: ([^\s,)]+)/);
                            const finalSlug = slugMatch ? slugMatch[1] : document.id || 'nouvelle-fiche';
                            
                            uploadProgress.completeBuild(finalSlug, deployUrl);
                            
                            // Reset du formulaire après succès
                            setTimeout(() => {
                                formRef.current?.reset();
                                setFormState(initialFormState);
                            }, 2000);
                        } else if (progress.type === 'error') {
                            uploadProgress.setStepError('build', progress.message);
                        }
                        break;
                        
                    default:
                        console.warn('Unknown progress step:', progress.step);
                        if (progress.type === 'error') {
                            uploadProgress.setStepError('validation', progress.message);
                        }
                }
            });
            
        } catch (error) {
            console.error("Error submitting form:", error);
            uploadProgress.setStepError('validation', `Erreur lors de l'envoi: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
    };

    const { contributor, cover, document, status } = formState;

    return (
        <>
            <form 
                className="card md:card-side shadow-xl form-control " 
                id="uploadForm" 
                ref={formRef} 
                onSubmit={handleSubmit}
                aria-labelledby="upload-form-title"
            >
                
                <div className="card-body flex flex-col gap-4">
                    <div className="flex flex-row gap-4">

                        {/* Cover */}
                        <div className="w-[200px] h-[300px] shrink-0">
                            <CoverUpload 
                                value={cover.file}
                                onChange={handleCoverChange}
                                onError={(error) => setFormState(prev => ({ ...prev, cover: { ...prev.cover, validation: { isValid: false, message: error } } }))}
                                disabled={status.isUploading}
                                maxSizeMB={5}
                                allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
                            />       
                        </div>
                        <div className="grow">
                            <div className="flex flex-col gap-4 grow items-stretch">
                                
                                {/* <StatusMessage message={status.message} type={status.type} /> */}

                                <FileUpload 
                                    value={document.file}
                                    onChange={(file, metadata, fileId) => {
                                        setFormState(prev => ({
                                            ...prev,
                                            document: {
                                                ...prev.document,
                                                file,
                                                metadata,
                                                id: fileId,
                                                validation: { isValid: true }
                                            }
                                        }));
                                    }}
                                    onError={(error) => {
                                        setFormState(prev => ({
                                            ...prev,
                                            document: {
                                                ...prev.document,
                                                validation: { isValid: false, message: error }
                                            },
                                            status: {
                                                isUploading: false,
                                                message: error,
                                                type: 'error'
                                            }
                                        }));
                                    }}
                                    disabled={status.isUploading}
                                    className="grow"
                                />


                                <ContributorField 
                                    value={contributor}
                                    onChange={handleContributorChange}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end items-center gap-4">
                        <p className="alert alert-info alert-soft">
                            Après envoi, la fiche de lecture sera disponible après quelques minutes. 
                        </p>
                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={status.isUploading}
                            aria-busy={status.isUploading}
                        >
                            {status.isUploading ? 'Envoi en cours...' : 'Ajouter'}
                        </button>
                    </div>
                </div>
            </form>
            {/* Modal de progression de l'upload */}
            <UploadProgressModal
                isOpen={uploadProgress.isOpen}
                onClose={uploadProgress.closeModal}
                canClose={uploadProgress.canClose}
                steps={uploadProgress.steps}
                currentStep={uploadProgress.currentStep}
                finalUrl={uploadProgress.finalUrl}
                ficheId={uploadProgress.ficheId}
            />
        </>
);
}