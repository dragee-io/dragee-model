export const generateId = (namespace: string, label: string) => `${namespace}/${constructId(label)}`

/**
 * Constructs a formatted ID from a label  
 * Example :
 * ```
 * Aggregates Allowed Dependencies => aggregates-allowed-dependencies
 * Class Diagram => class-diagram
 * ```
 * @param label label
 * @returns formatted ID
 */
const constructId = (label: string) =>
    label.replace(/[".*+?^${}()|[\]]/g, "") // Deleting special characters
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Normalizing and deleting accents
        .toLowerCase() // Lower case
        .trim().replace(/['\\/]/g, " ") // Replacing apostrophes, slashes and backslashes by spaces
        .trim().replace(/\s+/g, "-"); // Replacing spaces by dashes
