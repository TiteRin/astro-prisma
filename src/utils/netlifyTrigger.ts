/**
 * Utilitaire pour déclencher le webhook de reconstruction Netlify
 */

/**
 * Déclenche le webhook Netlify pour déclencher un nouveau build
 * @returns Résultat de la requête avec le statut (succès/échec)
 */
export async function triggerNetlifyBuild(): Promise<{ success: boolean; message: string }> {
  try {
    const buildHookUrl = import.meta.env.NETLIFY_BUILD_HOOK;
    
    if (!buildHookUrl) {
      console.warn("Aucun webhook Netlify n'est configuré. Ignoré.");
      return { 
        success: false, 
        message: "Aucun webhook Netlify n'est configuré" 
      };
    }
    
    // Envoyer une requête POST pour déclencher le build
    const response = await fetch(buildHookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    if (response.ok) {
      console.log('Build Netlify déclenché avec succès');
      return { 
        success: true, 
        message: 'Build Netlify déclenché avec succès' 
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