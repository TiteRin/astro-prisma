import React, { useEffect, useState } from 'react';
import './UploadProgressModal.scss';

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
    }
  }, [isOpen]);

  const handleClose = () => {
    if (canClose) {
      setIsVisible(false);
      setTimeout(() => onClose(), 300); // Attendre la fin de l'animation
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && canClose) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'progress':
        return '⏳';
      default:
        return '⏸️';
    }
  };

  const isCompleted = steps.some(step => step.status === 'success' && (step.id === 'deploy-complete' || step.id === 'final'));
  const hasError = steps.some(step => step.status === 'error');

  return (
    <div 
      className={`upload-modal-overlay ${isVisible ? 'visible' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`upload-modal ${isVisible ? 'visible' : ''}`}>
        <div className="upload-modal__header">
          <h2>Upload de la fiche de lecture</h2>
          {canClose && (
            <button 
              className="upload-modal__close"
              onClick={handleClose}
              aria-label="Fermer"
            >
              ×
            </button>
          )}
        </div>

        <div className="upload-modal__content">
          <div className="upload-modal__steps">
            {steps.map((step) => (
              <div 
                key={step.id}
                className={`upload-step upload-step--${step.status} ${currentStep === step.id ? 'upload-step--current' : ''}`}
              >
                <div className="upload-step__icon">
                  {getStepIcon(step)}
                </div>
                <div className="upload-step__content">
                  <div className="upload-step__message">
                    {step.status === 'progress' ? (
                      <>
                        {step.message.replace(/\.+$/, '')}
                        <span className="upload-step__dots"></span>
                      </>
                    ) : (
                      step.message
                    )}
                  </div>
                  {step.timestamp && (
                    <div className="upload-step__timestamp">
                      {step.timestamp.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isCompleted && finalUrl && ficheId && (
            <div className="upload-modal__success">
              <div className="upload-modal__success-icon">🎉</div>
              <div className="upload-modal__success-message">
                <strong>Déploiement terminé avec succès !</strong>
                <p>
                  Votre nouvelle fiche est accessible à l'adresse :{' '}
                  <a 
                    href={`${finalUrl}/fiches/${ficheId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="upload-modal__fiche-link"
                  >
                    {finalUrl}/fiches/{ficheId}
                  </a>
                </p>
              </div>
            </div>
          )}

          {hasError && (
            <div className="upload-modal__error">
              <div className="upload-modal__error-icon">⚠️</div>
              <div className="upload-modal__error-message">
                Une erreur s'est produite pendant l'upload. Vous pouvez fermer cette fenêtre et réessayer.
              </div>
            </div>
          )}
        </div>

        <div className="upload-modal__footer">
          {!canClose && (
            <div className="upload-modal__info">
              <small>⏳ Veuillez patienter pendant le traitement...</small>
            </div>
          )}
          {canClose && (
            <button 
              className="upload-modal__button upload-modal__button--primary"
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