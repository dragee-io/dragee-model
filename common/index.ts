export { generateId } from "./utils/id-generation.utils.ts";

export enum DependencyType {
    CONSTRUCTOR = 'constructor',
    FIELD = 'field',
    METHOD_PARAM = 'method_param',
    METHOD_RETURN = 'method_return'
}
export interface Dependency extends Record<string, DependencyType> {
}
export interface Dragee {
    name: string,
    profile: string,
    depends_on: Dependency[]
}

export interface DrageeDependency {
    root: Dragee,
    dependencies: Dragee[]
}