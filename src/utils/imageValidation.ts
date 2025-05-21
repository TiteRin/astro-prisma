/**
 * Utilitaires de validation d'images pour les APIs
 * Utilisés à la fois dans upload-temp.ts et create-note.ts
 */

/**
 * Extrait les URLs d'images d'un contenu Markdown
 * @param content Contenu Markdown à analyser
 * @returns Tableau des URLs d'images trouvées
 */
export function extractImageUrls(content: string): string[] {
  // Match both markdown image syntax ![alt](url) and HTML img tags
  const imageRegex = /!\[(.*?)\]\((.*?)\)|<img[^>]+src="([^">]+)"/g;
  const urls: string[] = [];
  let match;

  while ((match = imageRegex.exec(content)) !== null) {
    // match[1] is for alt text in markdown, match[2] is for url in markdown, match[3] is for url in HTML img tags
    const url = match[2] || match[3];
    if (url) {
      urls.push(url);
    }
  }

  return urls;
}

/**
 * Vérifie la présence de textes alternatifs pour les images dans le contenu Markdown
 * @param content Contenu Markdown à analyser
 * @returns Résultat de validation avec erreurs éventuelles
 */
export async function validateMarkdownImageAlt(content: string): Promise<{ valid: boolean; errors: string[] }> {
  const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
  const errors: string[] = [];
  const matches = content.matchAll(imageRegex);
  
  for (const match of matches) {
    const [, altText, imagePath] = match;
    
    // Vérifier si l'image a un texte alternatif
    if (!altText || altText.trim().length === 0) {
      errors.push(`Image sans texte alternatif: ${imagePath}`);
      continue;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valide les URLs d'images (domaines autorisés/bloqués et accessibilité)
 * @param urls Tableau d'URLs à valider
 * @returns Résultat de validation avec erreurs éventuelles
 */
export async function validateImageUrls(urls: string[]): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Parse domain lists from environment variables
  const allowedDomains = import.meta.env.ALLOWED_IMAGE_DOMAINS?.split(',').filter(Boolean) || [];
  const blockedDomains = import.meta.env.BLOCKED_IMAGE_DOMAINS?.split(',').filter(Boolean) || [];

  for (const url of urls) {
    // Check if URL is absolute
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      errors.push(`L'image "${url}" doit utiliser une URL absolue (commençant par http:// ou https://)`);
      continue;
    }

    try {
      const urlObj = new URL(url);
      
      // Check blocked domains first
      if (blockedDomains.length > 0 && blockedDomains.some((domain: string) => urlObj.hostname.includes(domain))) {
        errors.push(`Le domaine de l'image "${url}" est bloqué.`);
        continue;
      }

      // Check allowed domains if specified
      if (allowedDomains.length > 0 && !allowedDomains.some((domain: string) => urlObj.hostname.includes(domain))) {
        errors.push(`Le domaine de l'image "${url}" n'est pas dans la liste des domaines autorisés.`);
        continue;
      }

      // Try to fetch the image with a timeout
      let isAccessible = false;
      
      // First try a HEAD request (faster)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout
        
        const headResponse = await fetch(url, { 
          method: 'HEAD',
          signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        isAccessible = headResponse.ok;
      } catch (headError) {
        // HEAD request failed or timed out, try GET as fallback
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const getResponse = await fetch(url, {
            method: 'GET',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          isAccessible = getResponse.ok;
        } catch (getError) {
          isAccessible = false;
        }
      }
      
      if (!isAccessible) {
        errors.push(`L'image "${url}" n'est pas accessible ou le serveur a mis trop de temps à répondre.`);
      }
    } catch (error) {
      errors.push(`Impossible de vérifier l'accessibilité de l'image "${url}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
} 