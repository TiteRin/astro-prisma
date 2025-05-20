import React, { useState } from 'react';
import SilentUpload from './SilentUpload';

interface FileInfo {
  id: string;
  title?: string;
  authors?: string[];
  tags?: string[];
  description?: string;
}

export default function SilentUploadDemo() {
  const [uploadedFile, setUploadedFile] = useState<FileInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingResult, setProcessingResult] = useState<string | null>(null);

  // Gérer la fin de l'upload
  const handleUploadComplete = (fileId: string, metadata: Record<string, any>) => {
    console.log('Upload terminé:', fileId, metadata);
    
    // Stocker les informations du fichier
    setUploadedFile({
      id: fileId,
      title: metadata.title || metadata.bookTitle,
      authors: metadata.authors || metadata.bookAuthors,
      tags: metadata.tags,
      description: metadata.summary || metadata.description
    });
  };

  // Simuler un traitement sur le fichier téléchargé
  const handleProcessFile = () => {
    if (!uploadedFile) return;
    
    setIsProcessing(true);
    setProcessingResult(null);
    
    // Simulation d'un traitement avec une promesse
    new Promise<void>(resolve => {
      // Simuler un traitement qui prend du temps (2 secondes)
      setTimeout(() => {
        resolve();
      }, 2000);
    })
    .then(() => {
      setProcessingResult(`Le fichier "${uploadedFile.title || uploadedFile.id}" a été traité avec succès!`);
    })
    .finally(() => {
      setIsProcessing(false);
    });
  };

  // Réinitialiser la démo
  const resetDemo = () => {
    setUploadedFile(null);
    setProcessingResult(null);
    setIsProcessing(false);
  };

  return (
    <div className="silent-upload-demo">
      {!uploadedFile ? (
        // Étape 1: Télécharger un fichier
        <div className="silent-upload-demo__step">
          <h2>Étape 1: Télécharger un fichier</h2>
          <p>Utilisez le composant ci-dessous pour télécharger un fichier Markdown.</p>
          
          <SilentUpload onUploadComplete={handleUploadComplete} />
        </div>
      ) : (
        // Étape 2: Fichier téléchargé, prêt à être traité
        <div className="silent-upload-demo__step">
          <h2>Étape 2: Traiter le fichier</h2>
          
          <div className="silent-upload-demo__file-info">
            <h3>Fichier téléchargé</h3>
            <ul>
              <li><strong>ID:</strong> {uploadedFile.id}</li>
              <li><strong>Titre:</strong> {uploadedFile.title || 'Non spécifié'}</li>
              <li><strong>Auteurs:</strong> {uploadedFile.authors?.join(', ') || 'Non spécifiés'}</li>
              <li><strong>Tags:</strong> {uploadedFile.tags?.join(', ') || 'Non spécifiés'}</li>
            </ul>
            
            {uploadedFile.description && (
              <div className="silent-upload-demo__description">
                <h4>Description:</h4>
                <p>{uploadedFile.description}</p>
              </div>
            )}
          </div>
          
          <div className="silent-upload-demo__actions">
            {!processingResult ? (
              <button 
                className="silent-upload-demo__button"
                onClick={handleProcessFile}
                disabled={isProcessing}
              >
                {isProcessing ? 'Traitement en cours...' : 'Traiter le fichier'}
              </button>
            ) : (
              <div className="silent-upload-demo__result">
                <p className="silent-upload-demo__success">{processingResult}</p>
                <button 
                  className="silent-upload-demo__button"
                  onClick={resetDemo}
                >
                  Recommencer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 