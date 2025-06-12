import { useState, useEffect } from 'react';
import UploadProgressModal from './UploadProgressModal';
import { config } from './config';

type StepStatus = 'pending' | 'progress' | 'success' | 'error';

interface Step {
  id: string;
  message: string;
  status: StepStatus;
  timestamp?: Date;
  errorMessage?: string;
}

type DemoScenario = 'success' | 'validation-error' | 'upload-error' | 'build-error';

interface UploadProgressModalDemoProps {
  scenario: DemoScenario;
}

const DEMO_STEPS: Step[] = Object.entries(config.steps).map(([key, step]) => ({
  id: step.id,
  message: step.messages.pending,
  status: 'pending',
}));

export default function UploadProgressModalDemo({ scenario }: UploadProgressModalDemoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [steps, setSteps] = useState<Step[]>(DEMO_STEPS);
  const [currentStep, setCurrentStep] = useState<string | undefined>();
  const [canClose, setCanClose] = useState(false);
  const [finalUrl, setFinalUrl] = useState<string>();
  const [ficheId, setFicheId] = useState<string>();

  const resetDemo = () => {
    setSteps(DEMO_STEPS);
    setCurrentStep(undefined);
    setCanClose(false);
    setFinalUrl(undefined);
    setFicheId(undefined);
  };

  const getStepMessage = (step: Step) => {
    const stepConfig = config.steps[step.id as keyof typeof config.steps];
    return stepConfig.messages[step.status];
  };

  const simulateProgress = async () => {
    for (const [key, stepConfig] of Object.entries(config.steps)) {
      // Définir l'étape courante
      setCurrentStep(stepConfig.id);
      
      // Mettre à jour le statut en cours
      setSteps(prev => prev.map(step => 
        step.id === stepConfig.id 
          ? { ...step, status: 'progress', timestamp: new Date() }
          : step
      ));

      // Attendre la durée spécifiée
      await new Promise(resolve => setTimeout(resolve, stepConfig.duration));

      // Vérifier si c'est l'étape qui doit échouer
      const shouldFail = scenario === `${stepConfig.id}-error`;

      if (shouldFail) {
        setSteps(prev => prev.map(step => 
          step.id === stepConfig.id 
            ? { 
                ...step, 
                status: 'error', 
                timestamp: new Date(),
                errorMessage: stepConfig.errorMessage
              }
            : step
        ));
        setCanClose(true);
        return;
      }

      // Mettre à jour le statut en succès
      setSteps(prev => prev.map(step => 
        step.id === stepConfig.id 
          ? { ...step, status: 'success', timestamp: new Date() }
          : step
      ));
    }

    // Finalisation
    setFinalUrl('https://example.com');
    setFicheId('demo-123');
    setCanClose(true);
  };

  const handleStart = () => {
    resetDemo();
    setIsOpen(true);
    simulateProgress();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Démo du Modal de Progression</h2>
        <p className="text-base-content/70">
          Ce composant affiche la progression de l'upload d'une fiche de lecture.
          Cliquez sur le bouton ci-dessous pour simuler un upload.
        </p>
        <div className="card-actions justify-end">
          <button 
            className="btn btn-primary"
            onClick={handleStart}
            disabled={isOpen}
          >
            Démarrer la simulation
          </button>
        </div>
      </div>

      <UploadProgressModal
        isOpen={isOpen}
        onClose={handleClose}
        canClose={canClose}
        steps={steps.map(step => ({
          ...step,
          message: getStepMessage(step)
        }))}
        currentStep={currentStep}
        finalUrl={finalUrl}
        ficheId={ficheId}
      />
    </div>
  );
} 