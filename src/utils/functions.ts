export function pluralize(count: number, word: string, plural = word + "s") {
    return [-1, 1].includes(count) ? word : plural;
}

/**
 * Convertit une chaîne en format kebab-case
 * Ex: "Hello World" -> "hello-world"
 * Ex: "Les Hommes hétéros" -> "les-hommes-heteros"
 */
export function kebabCase(str: string): string {
  return str
    .toLowerCase()
    // Normaliser les caractères accentués (é -> e, à -> a, etc.)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')        // Remplace les espaces par des tirets
    .replace(/[^\w\-]+/g, '')    // Supprime les caractères spéciaux
    .replace(/\-\-+/g, '-')      // Remplace les tirets multiples par un seul
    .replace(/^-+/, '')          // Supprime les tirets au début
    .replace(/-+$/, '');         // Supprime les tirets à la fin
}