import { Glob } from "bun";
import { type Dragee, generateId } from "../common"

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
    return { id: generateId(namespace, graph.label), ...graph }
}