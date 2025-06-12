import React, { useEffect, useState } from 'react';
import { Check, AlertCircle, Loader2, X } from 'lucide-react';

interface ProgressStep {
  id: string;
  message: string;
  status: 'pending' | 'progress' | 'success' | 'error';
  timestamp?: Date;
  errorMessage?: string;
}

interface UploadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  canClose: boolean;
  steps: ProgressStep[];
  currentStep?: string;
  finalUrl?: string;
  ficheId?: string;
}

export default function UploadProgressModal({
  isOpen,
  onClose,
  canClose,
  steps,
  currentStep,
  finalUrl,
  ficheId
}: UploadProgressModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (canClose) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && canClose) {
      onClose();
    }
  };

  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'success':
        return (
          <div className="flex items-center gap-2 text-success">
            <Check className="h-6 w-6" />
            <span>{step.message}</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="h-6 w-6" />
            <span>{step.message}</span>
          </div>
        );
      case 'progress':
        return (
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>{step.message}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-base-content/50">
            <span className="h-6 w-6" />
            <span>{step.message}</span>
          </div>
        );
    }
  };

  const isCompleted = steps.every(step => step.status === 'success');
  const hasError = steps.some(step => step.status === 'error');

  if (!isVisible && !isOpen) return null;

  return (
    <dialog 
      className={`modal ${isVisible ? 'modal-open' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className="modal-box max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Upload de la fiche de lecture</h3>
          {canClose && (
            <button 
              className="btn btn-ghost btn-circle btn-sm"
              onClick={handleClose}
              aria-label="Fermer"
            >
              <X />
            </button>
          )}
        </div>

        <div className="space-y-6">
          <ul className="steps steps-vertical w-full">
            {steps.map((step) => (
              <li 
                key={step.id}
                className={`step ${
                  step.status === 'success' ? 'step-success' :
                  step.status === 'error' ? 'step-error' :
                  currentStep === step.id ? 'step-primary' :
                  ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getStepIcon(step)}
                  </div>
                  <div className="flex-grow">
                    <div className="font-medium">
                      {step.timestamp && (
                        <div className="text-left text-xs text-base-content/70 mt-1">
                          {step.timestamp.toLocaleTimeString()}
                        </div>
                      )}
                      {step.errorMessage && (
                        <div className="text-xs text-error mt-1">
                          {step.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {isCompleted && finalUrl && ficheId && (
            <div className="alert alert-success shadow-lg">
              <div className="flex items-center gap-4">
                <div className="text-3xl">🎉</div>
                <div>
                  <h3 className="font-bold">Déploiement terminé avec succès !</h3>
                  <div className="text-sm">
                    Votre nouvelle fiche est accessible à l'adresse :{' '}
                    <a 
                      href={`${finalUrl}/fiches/${ficheId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary hover:link-secondary font-medium"
                    >
                      {finalUrl}/fiches/{ficheId}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {hasError && (
            <div className="alert alert-error shadow-lg">
              <div className="flex items-center gap-4">
                <div className="text-3xl">⚠️</div>
                <div>
                  <h3 className="font-bold">Une erreur s'est produite</h3>
                  <div className="text-sm">
                    Une erreur s'est produite pendant l'upload. Vous pouvez fermer cette fenêtre et réessayer.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-action mt-6">
          {!canClose && (
            <div className="text-sm text-base-content/70 flex items-center gap-2">
              <span className="loading loading-spinner loading-xs"></span>
              Veuillez patienter pendant le traitement...
            </div>
          )}
          {canClose && (
            <button 
              className="btn btn-primary"
              onClick={handleClose}
            >
              {isCompleted ? 'Terminer' : 'Fermer'}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
} 