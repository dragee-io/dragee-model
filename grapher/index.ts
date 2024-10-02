import { Glob } from "bun";
import type { Dragee } from "@dragee-io/type";

export type Grapher = {
    readonly namespace: string,
    readonly graphs: Graph[],
}

export type DeclaredGraph = {
    readonly label: string,
    readonly handler: (dragees: Dragee[]) => string
}

export type Graph = DeclaredGraph & { readonly id: string }

/**
 * Graphs scanning in grapher directory
 * Adds a generated ID for every graph
 * @param namespace grapher namespace
 * @param dir scanned directory
 * @returns graphs found in dir
 */
export const findGraphs = (namespace: string, dir: string) : Graph[] => {
    const scan = new Glob(`*.graph.ts`).scanSync({
        cwd: dir,
        absolute: true,
        onlyFiles: true
    });

    return Array.from(scan)
        .map(file => require(file).default)
        .filter((graph): graph is DeclaredGraph => graph)
        .map(graph => declaredGraphToGraph(namespace, graph))
}

const declaredGraphToGraph = (namespace: string, graph: DeclaredGraph): Graph => {
    return { id: generateGraphId(namespace, graph), ...graph }
}

const generateGraphId = (namespace: string, graph: DeclaredGraph) => `${namespace}/${constructGraphId(graph.label)}`

/**
 * Constructs a formatted graph ID from its label  
 * Example :
 * ```
 * Aggregates Allowed Dependencies => aggregates-allowed-dependencies
 * ```
 * @param label graph label
 * @returns formatted ID
 */
const constructGraphId = (label: string) =>
    label.replace(/[".*+?^${}()|[\]]/g, "") // Deleting special characters
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Normalizing and deleting accents
        .toLowerCase() // Lower case
        .trim().replace(/['\\/]/g, " ") // Replacing apostrophes, slashes and backslashes by spaces
        .trim().replace(/\s+/g, "-"); // Replacing spaces by dashes
