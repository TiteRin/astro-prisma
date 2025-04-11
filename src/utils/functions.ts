export function pluralize(count: number, word: string, plural = word + "s") {
    return [-1, 1].includes(count) ? word : plural;
}