import { useState, useCallback } from 'react';

interface ProgressStep {
  id: string;
  message: string;
  status: 'pending' | 'progress' | 'success' | 'error';
  timestamp?: Date;
}

interface UploadProgressState {
  isOpen: boolean;
  canClose: boolean;
  steps: ProgressStep[];
  currentStep?: string;
  finalUrl?: string;
  ficheId?: string;
}

const initialSteps: ProgressStep[] = [
  { id: 'validation', message: 'Validation des fichiers en cours', status: 'pending' },
  { id: 'envoi', message: 'Envoi des fichiers sur le SFTP', status: 'pending' },
  { id: 'build', message: 'Déclenchement et suivi du déploiement', status: 'pending' }
];

export function useUploadProgress() {
  const [state, setState] = useState<UploadProgressState>({
    isOpen: false,
    canClose: false,
    steps: [...initialSteps],
    currentStep: undefined,
    finalUrl: undefined,
    ficheId: undefined
  });

  const openModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: true,
      canClose: false,
      steps: [...initialSteps],
      currentStep: 'validation',
      finalUrl: undefined,
      ficheId: undefined
    }));
  }, []);

  const closeModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      canClose: false,
      steps: [...initialSteps],
      currentStep: undefined,
      finalUrl: undefined,
      ficheId: undefined
    }));
  }, []);

  const updateStep = useCallback((stepId: string, status: ProgressStep['status'], message?: string) => {
    setState(prev => ({
      ...prev,
      currentStep: status === 'progress' ? stepId : prev.currentStep,
      steps: prev.steps.map(step => 
        step.id === stepId 
          ? { 
              ...step, 
              status, 
              message: message || step.message,
              timestamp: status !== 'pending' ? new Date() : step.timestamp
            }
          : step
      )
    }));
  }, []);

  const setProgress = useCallback((stepId: string, message?: string) => {
    updateStep(stepId, 'progress', message);
  }, [updateStep]);

  const setSuccess = useCallback((stepId: string, message?: string) => {
    updateStep(stepId, 'success', message);
  }, [updateStep]);

  const setError = useCallback((stepId: string, message?: string) => {
    setState(prev => ({
      ...prev,
      canClose: true,
      currentStep: undefined,
      steps: prev.steps.map(step => 
        step.id === stepId 
          ? { 
              ...step, 
              status: 'error',
              message: message || step.message,
              timestamp: new Date()
            }
          : step
      )
    }));
  }, []);

  const setComplete = useCallback((ficheId: string, finalUrl?: string) => {
    setState(prev => ({
      ...prev,
      canClose: true,
      currentStep: undefined,
      ficheId,
      finalUrl: finalUrl || window.location.origin,
      steps: prev.steps.map(step => 
        step.id === 'build'
          ? { 
              ...step, 
              status: 'success',
              message: 'Déploiement terminé avec succès !',
              timestamp: new Date()
            }
          : step
      )
    }));
  }, []);

  // Fonctions de progression spécifiques pour chaque étape
  const startValidation = useCallback(() => {
    setProgress('validation', 'Validation des fichiers en cours');
  }, [setProgress]);

  const completeValidation = useCallback(() => {
    setSuccess('validation', 'Validation des fichiers réussie');
  }, [setSuccess]);

  const startEnvoi = useCallback(() => {
    setProgress('envoi', 'Envoi des fichiers sur le SFTP');
  }, [setProgress]);

  const completeEnvoi = useCallback(() => {
    setSuccess('envoi', 'Envoi des fichiers réussi');
  }, [setSuccess]);

  const startBuild = useCallback(() => {
    setProgress('build', 'Déclenchement du build en cours');
  }, [setProgress]);

  const updateBuildProgress = useCallback((message: string) => {
    setProgress('build', message);
  }, [setProgress]);

  const completeBuild = useCallback((ficheId: string, finalUrl?: string) => {
    setComplete(ficheId, finalUrl);
  }, [setComplete]);

  // Fonction d'erreur générique
  const setStepError = useCallback((stepId: string, errorMessage: string) => {
    setError(stepId, errorMessage);
  }, [setError]);

  return {
    ...state,
    openModal,
    closeModal,
    updateStep,
    startValidation,
    completeValidation,
    startEnvoi,
    completeEnvoi,
    startBuild,
    updateBuildProgress,
    completeBuild,
    setStepError
  };
} 