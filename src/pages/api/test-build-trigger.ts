import type { APIRoute } from "astro";
import { triggerAndTrackNetlifyBuild } from "../../utils/netlifyTrigger";

export const prerender = false;

/**
 * Endpoint de test pour déclencher et suivre un build Netlify
 * Utilise Server-Sent Events pour envoyer les mises à jour en temps réel
 */
export const POST: APIRoute = async ({ request }) => {
  // Créer un stream pour les Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Fonction pour envoyer des données au client
      const sendUpdate = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(message));
      };

      // Démarrer le processus de build avec suivi
      triggerAndTrackNetlifyBuild(async (update) => {
        // Envoyer chaque mise à jour au client
        sendUpdate({
          type: 'info',
          message: update.message,
          progress: update.progress || 0,
          status: update.status
        });
      }, "Test de déploiement depuis l'interface d'administration")
      .then((result) => {
        // Envoyer le résultat final
        sendUpdate({
          type: result.success ? 'success' : 'error',
          message: result.message,
          progress: result.success ? 100 : undefined,
          deployUrl: result.deployUrl,
          deployId: result.deployId,
          final: true
        });
        
        // Fermer le stream
        controller.close();
      })
      .catch((error) => {
        // Envoyer l'erreur et fermer le stream
        sendUpdate({
          type: 'error',
          message: `Erreur lors du test de build: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          final: true
        });
        controller.close();
      });

      // Envoyer un message initial
      sendUpdate({
        type: 'info',
        message: 'Démarrage du test de build Netlify...',
        progress: 0
      });
    }
  });

  // Retourner la réponse avec les en-têtes appropriés pour Server-Sent Events
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

/**
 * Endpoint GET pour vérifier la configuration
 */
export const GET: APIRoute = async () => {
  const siteId = import.meta.env.NETLIFY_SITE_ID;
  const apiToken = import.meta.env.NETLIFY_API_TOKEN;
  const buildHook = import.meta.env.NETLIFY_BUILD_HOOK;

  const config = {
    hasSiteId: !!siteId,
    hasApiToken: !!apiToken,
    hasBuildHook: !!buildHook,
    canTrackBuilds: !!(siteId && apiToken),
    canTriggerBuilds: !!buildHook,
    buildHookValid: false,
    netlifyApiAccessible: false,
    siteAccessible: false
  };

  const checks = [];

  // Vérification de base des variables d'environnement
  checks.push({
    name: 'Variables d\'environnement',
    status: config.hasBuildHook && config.hasSiteId && config.hasApiToken ? 'success' : 'warning',
    message: config.hasBuildHook && config.hasSiteId && config.hasApiToken 
      ? 'Toutes les variables sont configurées' 
      : 'Certaines variables sont manquantes'
  });

  // Test de la validité du webhook (format URL)
  if (buildHook) {
    try {
      const url = new URL(buildHook);
      if (url.hostname === 'api.netlify.com' && url.pathname.includes('/build_hooks/')) {
        config.buildHookValid = true;
        checks.push({
          name: 'Format du webhook',
          status: 'success',
          message: 'URL du webhook valide'
        });
      } else {
        checks.push({
          name: 'Format du webhook',
          status: 'error',
          message: 'URL du webhook invalide (doit être api.netlify.com/build_hooks/...)'
        });
      }
    } catch (error) {
      checks.push({
        name: 'Format du webhook',
        status: 'error',
        message: 'URL du webhook malformée'
      });
    }
  } else {
    checks.push({
      name: 'Format du webhook',
      status: 'error',
      message: 'NETLIFY_BUILD_HOOK non configuré'
    });
  }

  // Test d'accès à l'API Netlify
  if (siteId && apiToken) {
    try {
      const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        config.netlifyApiAccessible = true;
        config.siteAccessible = true;
        const siteData = await response.json();
        checks.push({
          name: 'Accès API Netlify',
          status: 'success',
          message: `Site "${siteData.name}" accessible`
        });
      } else if (response.status === 401) {
        checks.push({
          name: 'Accès API Netlify',
          status: 'error',
          message: 'Token API invalide ou expiré'
        });
      } else if (response.status === 404) {
        checks.push({
          name: 'Accès API Netlify',
          status: 'error',
          message: 'Site non trouvé (vérifiez NETLIFY_SITE_ID)'
        });
      } else {
        checks.push({
          name: 'Accès API Netlify',
          status: 'error',
          message: `Erreur API: ${response.status}`
        });
      }
    } catch (error) {
      checks.push({
        name: 'Accès API Netlify',
        status: 'error',
        message: `Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  } else {
    checks.push({
      name: 'Accès API Netlify',
      status: 'warning',
      message: 'NETLIFY_SITE_ID ou NETLIFY_API_TOKEN manquant'
    });
  }

  // Test de connectivité du webhook (sans le déclencher)
  if (buildHook && config.buildHookValid) {
    try {
      // On fait juste un HEAD request pour tester la connectivité
      const response = await fetch(buildHook, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // Timeout de 5 secondes
      });

      if (response.status === 405) {
        // Method Not Allowed est attendu pour HEAD sur un webhook
        checks.push({
          name: 'Connectivité webhook',
          status: 'success',
          message: 'Webhook accessible'
        });
      } else if (response.status === 200 || response.status === 204) {
        checks.push({
          name: 'Connectivité webhook',
          status: 'success',
          message: 'Webhook accessible'
        });
      } else {
        checks.push({
          name: 'Connectivité webhook',
          status: 'warning',
          message: `Réponse inattendue: ${response.status}`
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        checks.push({
          name: 'Connectivité webhook',
          status: 'warning',
          message: 'Timeout - webhook peut être lent'
        });
      } else {
        checks.push({
          name: 'Connectivité webhook',
          status: 'error',
          message: `Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
        });
      }
    }
  }

  // Vérification des déploiements récents
  if (config.siteAccessible && siteId && apiToken) {
    try {
      const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=1`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const deploys = await response.json();
        if (deploys && deploys.length > 0) {
          const lastDeploy = deploys[0];
          const deployDate = new Date(lastDeploy.created_at).toLocaleString('fr-FR');
          checks.push({
            name: 'Historique des déploiements',
            status: 'success',
            message: `Dernier déploiement: ${deployDate} (${lastDeploy.state})`
          });
        } else {
          checks.push({
            name: 'Historique des déploiements',
            status: 'warning',
            message: 'Aucun déploiement trouvé'
          });
        }
      }
    } catch (error) {
      checks.push({
        name: 'Historique des déploiements',
        status: 'warning',
        message: 'Impossible de récupérer l\'historique'
      });
    }
  }

  // Déterminer si la configuration est prête
  const ready = config.canTriggerBuilds && config.buildHookValid && 
                (config.canTrackBuilds ? config.netlifyApiAccessible : true);

  return new Response(JSON.stringify({
    message: 'Vérification de la configuration du test de build',
    config,
    checks,
    ready,
    summary: {
      canTrigger: config.canTriggerBuilds && config.buildHookValid,
      canTrack: config.canTrackBuilds && config.netlifyApiAccessible,
      fullFunctionality: ready
    }
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}; 