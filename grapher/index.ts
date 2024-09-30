import type { Dragee } from "@dragee-io/type";

export type Graph = {
    readonly label: string,
    readonly handler: (dragees: Dragee[]) => string
}
export type Grapher = {
    readonly namespace: string,
    readonly graphs: Graph[],
}
