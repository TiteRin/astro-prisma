import type { Config } from './types';

export const config: Config = {
  steps: {
    validation: {
      id: 'validation',
      messages: {
        pending: 'Validation des fichiers',
        progress: 'Validation en cours...',
        success: 'Fichiers validés',
        error: 'Erreur de validation'
      },
      errorMessage: 'Le fichier ne respecte pas les critères requis (format, taille, etc.)',
      duration: 2000
    },
    envoi: {
      id: 'envoi',
      messages: {
        pending: 'Envoi des fichiers',
        progress: 'Envoi des fichiers...',
        success: 'Fichiers envoyés',
        error: 'Erreur lors de l\'envoi'
      },
      errorMessage: 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion.',
      duration: 3000
    },
    build: {
      id: 'build',
      messages: {
        pending: 'Déploiement',
        progress: 'Déploiement en cours...',
        success: 'Déploiement terminé',
        error: 'Erreur lors du déploiement'
      },
      errorMessage: 'Une erreur est survenue lors du déploiement. Veuillez réessayer.',
      duration: 4000
    }
  }
}; 