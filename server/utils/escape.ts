/**
 * Escapes a string for use in a regular expression.
 * Used to prevent ReDoS attacks when creating RegExp from user input.
 */
export function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
