import React, { useEffect, useState } from 'react';

interface ProgressStep {
  id: string;
  message: string;
  status: 'pending' | 'progress' | 'success' | 'error';
  timestamp?: Date;
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
        return '✓';
      case 'error':
        return '✕';
      case 'progress':
        return '⟳';
      default:
        return '○';
    }
  };

  const isCompleted = steps.every(step => step.status === 'success');
  const hasError = steps.some(step => step.status === 'error');

  if (!isVisible && !isOpen) return null;

  return (
    <div 
      className={`modal ${isVisible ? 'modal-open' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className="modal-box">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Upload de la fiche de lecture</h2>
          {canClose && (
            <button 
              className="btn btn-sm btn-circle"
              onClick={handleClose}
              aria-label="Fermer"
            >
              ×
            </button>
          )}
        </div>

        <div className="space-y-4">
          <ul className="steps steps-vertical">
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
                <div className="flex items-start gap-2">
                  <span className="step-icon">{getStepIcon(step)}</span>
                  <div>
                    <div className="font-medium">
                      {step.status === 'progress' ? (
                        <>
                          {step.message.replace(/\.+$/, '')}
                          <span className="loading loading-dots loading-xs"></span>
                        </>
                      ) : (
                        step.message
                      )}
                    </div>
                    {step.timestamp && (
                      <div className="text-xs text-base-content opacity-70">
                        {step.timestamp.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {isCompleted && finalUrl && ficheId && (
            <div className="alert alert-success">
              <div className="text-2xl">🎉</div>
              <div>
                <strong>Déploiement terminé avec succès !</strong>
                <p>
                  Votre nouvelle fiche est accessible à l'adresse :{' '}
                  <a 
                    href={`${finalUrl}/fiches/${ficheId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-success"
                  >
                    {finalUrl}/fiches/{ficheId}
                  </a>
                </p>
              </div>
            </div>
          )}

          {hasError && (
            <div className="alert alert-error">
              <div className="text-2xl">⚠️</div>
              <div>
                Une erreur s'est produite pendant l'upload. Vous pouvez fermer cette fenêtre et réessayer.
              </div>
            </div>
          )}
        </div>

        <div className="modal-action">
          {!canClose && (
            <div className="text-sm text-base-content opacity-70">
              ⏳ Veuillez patienter pendant le traitement...
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
    </div>
  );
} 