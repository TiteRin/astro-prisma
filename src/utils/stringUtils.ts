/**
 * Tronque un texte à une longueur maximale en s'arrêtant au dernier mot complet
 * @param text Le texte à tronquer
 * @param maxLength La longueur maximale (par défaut 250 caractères)
 * @returns Le texte tronqué avec "..." à la fin si nécessaire
 */
export const truncateText = (text: string, maxLength: number = 250): string => {
    if (!text || text.length <= maxLength) return text;
    
    // Trouver le dernier espace avant maxLength
    const lastSpace = text.substring(0, maxLength).lastIndexOf(' ');
    
    // Retourner le texte jusqu'au dernier espace + "..."
    return text.substring(0, lastSpace) + '...';
};

/**
 * Extension de la classe String pour ajouter la méthode truncate
 * @param maxLength La longueur maximale (par défaut 250 caractères)
 */
declare global {
    interface String {
        truncate(maxLength?: number): string;
    }
}

// Ajout de la méthode au prototype de String
String.prototype.truncate = function(maxLength: number = 250): string {
    return truncateText(this.toString(), maxLength);
}; 