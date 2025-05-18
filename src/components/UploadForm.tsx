import { Icon as IconifyIcon } from '@iconify/react';
import UploadProgress from "./UploadProgress";
import "../styles/upload-form.scss";
import "../types/upload-progress.d.ts";
import { useState, useRef } from 'react';

interface UploadFormProps {
    contributor?: string;
    defaultFile?: string;
    defaultImage?: string;
    formId?: string;
}

export default function UploadForm({
    contributor = "", 
    defaultFile = "", 
    defaultImage = "", 
    formId = "uploadForm" 
}: UploadFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('Choisissez un fichier ou glissez-le ici');
    const [coverImageName, setCoverImageName] = useState('Choisissez une image de couverture');
    const [isDragging, setIsDragging] = useState(false);
    
    const formRef = useRef<HTMLFormElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverImageInputRef = useRef<HTMLInputElement>(null);
    const submitButtonRef = useRef<HTMLButtonElement>(null);

    const setLoading = (loading: boolean) => {

        setIsLoading(loading);
        if (submitButtonRef.current) {
            submitButtonRef.current.setAttribute('data-loading', loading.toString());
            const buttonText = submitButtonRef.current.querySelector('.button-text');
            if (buttonText) {
                buttonText.textContent = loading ? 'En cours d\'envoi' : 'Envoyer la fiche';
            }
        }
    };

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isCoverImage = false) => {

        const file = e.target.files?.[0];
        if (file) {
            if (isCoverImage) {
                setCoverImageName(file.name);
            } else {
                setFileName(file.name);
            }
        }
    };

    const handleDragEvents = (e: React.DragEvent, isEntering: boolean) => {

        e.preventDefault();
        e.stopPropagation();
        setIsDragging(isEntering);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0 && fileInputRef.current) {
            fileInputRef.current.files = files;
            setFileName(files[0].name);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        const form = formRef.current;
        const fileInput = fileInputRef.current;
        
        if (!form || !fileInput) {
            console.error('Required DOM elements not found');
            return;
        }
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const file = fileInput.files?.[0];
        if (!file) {
            console.error('No file selected');
            return;
        }

        console.log('Starting file upload...');
        setLoading(true);
        window.uploadProgress?.start(file.name);
        const formData = new FormData(form);
    

        try {
            console.log('Sending fetch request...');
            const response = await fetch('/api/submit-note', {
                method: 'POST',
                body: formData,
                redirect: 'manual',
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No reader available');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    
                    try {
                        const notification = JSON.parse(line);
                        await delay(2000);
                        
                        switch (notification.step) {
                            case 'validation':
                                window.uploadProgress?.update(
                                    notification.type === 'success' 
                                        ? 'Le fichier est valide' 
                                        : notification.message,
                                    notification.type
                                );
                                break;
                            
                            case 'analysis':
                                if (notification.type === 'success') {
                                    const { bookTitle, bookAuthors, wordCount, sections } = notification.data || {};
                                    const authors = bookAuthors?.join(', ') || '';
                                    window.uploadProgress?.update(
                                        `Analyse terminée : "${bookTitle}" par ${authors} (${wordCount} mots, ${sections} sections)`,
                                        'success'
                                    );
                                }
                                break;
                            
                            case 'upload':
                                window.uploadProgress?.update(
                                    notification.type === 'success' 
                                        ? 'Fichier envoyé avec succès' 
                                        : 'Envoi du fichier en cours...',
                                    notification.type
                                );
                                break;
                            
                            case 'complete':
                                const url = notification.data?.url;
                                if (url) {
                                    window.uploadProgress?.update(`Fichier disponible à l'adresse : ${url}`, 'success');
                                    setTimeout(() => {
                                        form.reset();
                                        setFileName('Choisissez un fichier ou glissez-le ici');
                                        setCoverImageName('Choisissez une image de couverture');
                                        setLoading(false);
                                    }, 5000);
                                }
                                break;
                        }
                    } catch (e) {
                        console.error('Error parsing notification:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error during submission:', error);
            window.uploadProgress?.update('Une erreur est survenue lors de l\'envoi du fichier', 'error');
            await delay(5000);
            setLoading(false);
        }
    };

    return (
        <div className="upload-container" id={`${formId}-container`}>
            <form 
                className="upload-form" 
                id={formId} 
                encType="multipart/form-data" 
                noValidate 
                ref={formRef}
                onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                    console.log('Form submitted - handler called');
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit(e);
                    return false;
                }}
            >
                <h2 className="upload-form__title">Ajouter une nouvelle fiche de lecture</h2>

                <div className="upload-form__field">
                    <label htmlFor={`${formId}-contributor`}>Votre nom</label>
                    <input
                        type="text"
                        id={`${formId}-contributor`}
                        name="contributor"
                        defaultValue={contributor}
                        required
                        placeholder="Entrez votre nom"
                    />
                </div>

                <div 
                    className={`upload-form__file-upload ${isDragging ? 'highlight' : ''}`}
                    onDragEnter={(e) => handleDragEvents(e, true)}
                    onDragOver={(e) => handleDragEvents(e, true)}
                    onDragLeave={(e) => handleDragEvents(e, false)}
                    onDrop={handleDrop}
                >
                    <label htmlFor={`${formId}-fileInput`} className="upload-form__file-upload-label">
                        <input
                            type="file"
                            id={`${formId}-fileInput`}
                            name="new-note"
                            accept=".md,.mdx"
                            required
                            ref={fileInputRef}
                            onChange={(e) => handleFileChange(e)}
                            defaultValue={defaultFile}
                            aria-label="Sélectionner un fichier markdown"
                        />
                        <IconifyIcon icon="mdi:upload" width={24} height={24} />
                        <span>{fileName}</span>
                        <p>Seuls les fichiers .md et .mdx sont acceptés</p>
                    </label>
                </div>

                <div className="upload-form__file-upload">
                    <label htmlFor={`${formId}-coverImageInput`} className="upload-form__file-upload-label">
                        <input
                            type="file"
                            id={`${formId}-coverImageInput`}
                            name="cover-image"
                            accept="image/*"
                            required
                            ref={coverImageInputRef}
                            onChange={(e) => handleFileChange(e, true)}
                            defaultValue={defaultImage}
                            aria-label="Sélectionner une image de couverture"
                        />
                        <IconifyIcon icon="mdi:image" width={24} height={24} />
                        <span>{coverImageName}</span>
                        <p>Formats acceptés : JPG, PNG, GIF</p>
                    </label>
                </div>

                <div className="upload-form__info">
                    <h3>Important concernant les images</h3>
                    <p>Pour les images dans le contenu de votre fiche :</p>
                    <ul>
                        <li>Les images doivent être hébergées sur un service externe (comme Imgur, GitHub, etc.)</li>
                        <li>Utilisez des URLs absolues pour vos images</li>
                        <li>Vérifiez que les URLs sont accessibles publiquement</li>
                    </ul>
                </div>

                <div className="upload-form__field upload-form__draft-option">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            id={`${formId}-isDraft`}
                            name="is_draft"
                            value="true"
                        />
                        <span>Sauvegarder comme brouillon</span>
                    </label>
                    <p className="help-text">Les brouillons seront uniquement disponibles dans l'environnement de développement.</p>
                </div>

                <div className="upload-form__submit">
                    <button type="submit" id={`${formId}-submitButton`} className="btn-action with-border" ref={submitButtonRef}>
                        <span className="button-text">Envoyer la fiche</span>
                        <span className="loading-spinner" hidden>
                            <IconifyIcon icon="mdi:loading" width={24} height={24} />
                        </span>
                    </button>
                </div>
            </form>

            <UploadProgress formId={formId} />
        </div>
    );
} 