import { Icon as IconifyIcon } from '@iconify/react';
import { useEffect, useRef } from 'react';
import '../styles/upload-progress.scss';

interface UploadProgressProps {
    formId?: string;
}

export default function UploadProgress({ formId = "uploadForm" }: UploadProgressProps) {
    const progressRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const progressElement = progressRef.current;
        const messagesContainer = messagesRef.current;

        function addMessage(message: string, type = '') {
            if (!messagesContainer) return;
            
            const messageElement = document.createElement('div');
            messageElement.className = `message ${type}`;
            messageElement.textContent = message;
            messagesContainer.appendChild(messageElement);
        }

        function updateStepStatus(step: string, status: string, message?: string) {
            const stepElement = progressElement?.querySelector(`[data-step="${step}"]`);
            if (stepElement) {
                stepElement.setAttribute('data-status', status);
                if (message) {
                    const description = stepElement.querySelector('.step-description');
                    if (description) {
                        description.textContent = message;
                    }
                }
            }
        }

        // Export functions for use in the main form
        window.uploadProgress = {
            start: (fileName: string) => {
                if (progressElement) {
                    progressElement.setAttribute('data-active', 'true');
                    addMessage(`Le fichier "${fileName}" est en cours de téléversement...`, 'info');
                }
            },
            update: (message: string, type: string) => {
                addMessage(message, type);
            }
        };

        return () => {
            delete window.uploadProgress;
        };
    }, []);

    return (
        <div className="upload-progress" id={`${formId}-progress`} ref={progressRef}>
            <div className="upload-progress__messages" id={`${formId}-messages`} ref={messagesRef}>
                <div className="message">Prêt à recevoir les fichiers...</div>
            </div>

            <div className="upload-progress__steps">
                <div className="upload-progress__step" data-step="validation">
                    <div className="step-icon">
                        <IconifyIcon icon="mdi:check-circle" />
                    </div>
                    <div className="step-content">
                        <h3>Validation initiale</h3>
                        <p className="step-description">Vérification des informations de base...</p>
                    </div>
                </div>

                <div className="upload-progress__step" data-step="analysis">
                    <div className="step-icon">
                        <IconifyIcon icon="mdi:file-document" />
                    </div>
                    <div className="step-content">
                        <h3>Analyse du fichier</h3>
                        <p className="step-description">Extraction des métadonnées...</p>
                    </div>
                </div>

                <div className="upload-progress__step" data-step="upload">
                    <div className="step-icon">
                        <IconifyIcon icon="mdi:github" />
                    </div>
                    <div className="step-content">
                        <h3>Envoi vers GitHub</h3>
                        <p className="step-description">Téléchargement du fichier...</p>
                    </div>
                </div>

                <div className="upload-progress__step" data-step="build">
                    <div className="step-icon">
                        <IconifyIcon icon="mdi:rocket-launch" />
                    </div>
                    <div className="step-content">
                        <h3>Construction du site</h3>
                        <p className="step-description">Mise à jour du site...</p>
                    </div>
                </div>
            </div>
        </div>
    );
} 