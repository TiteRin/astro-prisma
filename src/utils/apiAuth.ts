/**
 * Utilitaire pour l'authentification des API
 */

/**
 * Vérifie si une clé API est valide
 * Utilise un hachage simple pour la démo, à remplacer par une solution plus robuste en production
 */
export function isValidApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  
  // Liste des clés API valides (en production, utiliser une base de données ou un service dédié)
  const validApiKeys = import.meta.env.API_KEYS?.split(',') || [];
  
  // Vérifier si la clé fournie est dans la liste des clés valides
  return validApiKeys.includes(apiKey);
}

/**
 * Extrait la clé API des en-têtes de la requête
 */
export function getApiKeyFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) return null;
  
  // Format attendu: "Bearer API_KEY_HERE"
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Vérifie si une requête est authentifiée
 */
export function isAuthenticatedRequest(request: Request): boolean {
  const apiKey = getApiKeyFromRequest(request);
  return isValidApiKey(apiKey);
}

/**
 * Crée une réponse d'erreur pour les requêtes non autorisées
 */
export function createUnauthorizedResponse(message: string = "Accès non autorisé"): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
} 