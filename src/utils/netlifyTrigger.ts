/**
 * Utilitaire pour déclencher le webhook de reconstruction Netlify
 */

/**
 * Nettoie et encode un message pour être sûr qu'il soit compatible JSON
 * @param message Message à nettoyer
 * @returns Message nettoyé et sécurisé pour JSON
 */
function sanitizeMessageForJson(message: string): string {
  if (!message) return message;
  
  // D'abord, décoder les entités HTML courantes
  let cleaned = message
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&#60;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#62;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&amp;/g, '&'); // Faire &amp; en dernier pour éviter les conflits
  
  // Ensuite, utiliser JSON.stringify pour échapper correctement le message
  // JSON.stringify ajoute des guillemets, donc on les retire
  return JSON.stringify(cleaned).slice(1, -1);
}

/**
 * Déclenche le webhook Netlify pour déclencher un nouveau build
 * @param customMessage Message personnalisé pour le commit (optionnel)
 * @returns Résultat de la requête avec le statut (succès/échec)
 */
export async function triggerNetlifyBuild(customMessage?: string): Promise<{ success: boolean; message: string }> {
  try {
    const buildHookUrl = import.meta.env.NETLIFY_BUILD_HOOK;
    
    if (!buildHookUrl) {
      console.warn("Aucun webhook Netlify n'est configuré. Ignoré.");
      return { 
        success: false, 
        message: "Aucun webhook Netlify n'est configuré" 
      };
    }
    
    // Préparer le payload avec le message personnalisé si fourni
    const payload: any = {};
    if (customMessage) {
      const cleanMessage = sanitizeMessageForJson(customMessage);
      payload.trigger_title = cleanMessage;
    }
    
    // Envoyer une requête POST pour déclencher le build
    const response = await fetch(buildHookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (response.ok) {
      const successMessage = customMessage 
        ? `Build Netlify déclenché avec succès: ${customMessage}`
        : 'Build Netlify déclenché avec succès';
      console.log(successMessage);
      return { 
        success: true, 
        message: successMessage
      };
    } else {
      const errorText = await response.text();
      console.error(`Échec du déclenchement du build Netlify: ${response.status} - ${errorText}`);
      return { 
        success: false, 
        message: `Échec du déclenchement du build Netlify: ${response.status}` 
      };
    }
  } catch (error) {
    console.error('Erreur lors du déclenchement du build Netlify:', error);
    return { 
      success: false, 
      message: `Erreur lors du déclenchement du build Netlify: ${error}` 
    };
  }
}

/**
 * Déclenche le webhook Netlify et suit l'état du déploiement
 * @param onProgressUpdate Fonction de callback pour les mises à jour de progression
 * @param customMessage Message personnalisé pour le commit (optionnel)
 * @returns Promesse avec le résultat final du déploiement
 */
export async function triggerAndTrackNetlifyBuild(
  onProgressUpdate?: (update: { status: string; progress?: number; message: string }) => void,
  customMessage?: string
): Promise<{ success: boolean; message: string; deployId?: string; deployUrl?: string }> {
  try {
    // 1. Déclencher le build avec le message personnalisé
    const buildResult = await triggerNetlifyBuild(customMessage);
    
    if (!buildResult.success) {
      return buildResult;
    }
    
    // Vérifier si les variables d'environnement nécessaires sont définies
    const siteId = import.meta.env.NETLIFY_SITE_ID;
    const apiToken = import.meta.env.NETLIFY_API_TOKEN;
    
    if (!siteId || !apiToken) {
      console.warn("Impossible de suivre le déploiement: NETLIFY_SITE_ID ou NETLIFY_API_TOKEN manquant");
      return { 
        ...buildResult,
        message: buildResult.message + " (impossible de suivre le déploiement: configuration manquante)"
      };
    }
    
    // Informer du début du suivi
    if (onProgressUpdate) {
      onProgressUpdate({ 
        status: 'building', 
        progress: 0, 
        message: 'Déploiement déclenché, en attente du début du build...' 
      });
    }
    
    // 2. Attendre que le build commence et suivre sa progression
    const deploymentResult = await pollDeploymentStatus(siteId, apiToken, onProgressUpdate);
    
    return deploymentResult;
    
  } catch (error) {
    console.error('Erreur lors du suivi du build Netlify:', error);
    return { 
      success: false, 
      message: `Erreur lors du suivi du build Netlify: ${error}` 
    };
  }
}

/**
 * Interroge l'API Netlify pour obtenir l'état du déploiement le plus récent
 * @param siteId Identifiant du site Netlify
 * @param apiToken Token API Netlify
 * @param onProgressUpdate Fonction de callback pour les mises à jour de progression
 * @returns Résultat du déploiement
 */
async function pollDeploymentStatus(
  siteId: string,
  apiToken: string,
  onProgressUpdate?: (update: { status: string; progress?: number; message: string }) => void
): Promise<{ success: boolean; message: string; deployId?: string; deployUrl?: string }> {
  // Nombre maximum de tentatives et intervalle entre les tentatives (en ms)
  const MAX_ATTEMPTS = 30;
  const POLL_INTERVAL = 5000;
  
  let attempts = 0;
  let latestDeployId: string | undefined = undefined;
  
  while (attempts < MAX_ATTEMPTS) {
    try {
      // Récupérer la liste des déploiements récents
      const deploysResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=1`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!deploysResponse.ok) {
        const errorText = await deploysResponse.text();
        console.error(`Erreur lors de la récupération des déploiements: ${deploysResponse.status} - ${errorText}`);
        return { 
          success: false, 
          message: `Erreur lors de la récupération des déploiements: ${deploysResponse.status}` 
        };
      }
      
      const deploys = await deploysResponse.json();
      
      if (!deploys || deploys.length === 0) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        continue;
      }
      
      const latestDeploy = deploys[0];
      
      // Si nous n'avons pas encore identifié le déploiement, enregistrer son ID
      if (!latestDeployId) {
        latestDeployId = latestDeploy.id;
        console.log(`Déploiement identifié: ${latestDeployId}`);
      }
      
      // Si ce n'est pas le même déploiement que celui que nous suivons, continuer à chercher
      if (latestDeploy.id !== latestDeployId) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        continue;
      }
      
      // États possibles: building, enqueued, processing, ready, error
      const status = latestDeploy.state;
      
      // Calculer la progression approximative basée sur l'état
      let progress = 0;
      let statusMessage = '';
      
      switch (status) {
        case 'enqueued':
          progress = 10;
          statusMessage = 'Build en file d\'attente...';
          break;
        case 'building':
          progress = 30;
          statusMessage = 'Build en cours...';
          break;
        case 'processing':
          progress = 70;
          statusMessage = 'Traitement du déploiement...';
          break;
        case 'ready':
          progress = 100;
          statusMessage = 'Déploiement terminé avec succès!';
          return {
            success: true,
            message: statusMessage,
            deployId: latestDeployId,
            deployUrl: latestDeploy.deploy_url || latestDeploy.url
          };
        case 'error':
          return {
            success: false,
            message: `Erreur lors du déploiement: ${latestDeploy.error_message || 'Raison inconnue'}`,
            deployId: latestDeployId
          };
        default:
          statusMessage = `État du déploiement: ${status}`;
      }
      
      // Mettre à jour la progression
      if (onProgressUpdate) {
        onProgressUpdate({ 
          status, 
          progress, 
          message: statusMessage 
        });
      }
      
      // Si le déploiement est toujours en cours, attendre et réessayer
      if (status !== 'ready' && status !== 'error') {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        continue;
      }
      
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'état du déploiement:', error);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }
  
  // Si nous arrivons ici, c'est que nous avons atteint le nombre maximum de tentatives
  return {
    success: false,
    message: 'Impossible de déterminer l\'état final du déploiement après plusieurs tentatives',
    deployId: latestDeployId
  };
}

/**
 * Récupère les détails d'un déploiement spécifique
 * @param siteId Identifiant du site Netlify
 * @param deployId Identifiant du déploiement
 * @param apiToken Token API Netlify
 * @returns Détails du déploiement
 */
export async function getDeploymentDetails(
  siteId: string,
  deployId: string,
  apiToken: string
): Promise<any> {
  try {
    const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys/${deployId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des détails du déploiement: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des détails du déploiement:', error);
    throw error;
  }
} 