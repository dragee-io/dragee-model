import {Glob} from "bun";

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
    kind_of: string,
    depends_on: Dependency[]
}
export type Namespace = string;
export type ReportStats = {
    rulesCount: number,
    passCount: number,
    errorsCount: number,
}
export type Report = {
    pass: boolean,
    namespace: Namespace,
    errors: string[],
    stats: ReportStats
};
export type SuccessfulRuleResult = {
    pass: true
}
export type FailedRuleResult = {
    pass: false,
    message: string,
}
export type RuleResult = SuccessfulRuleResult | FailedRuleResult

export type Successful = () => SuccessfulRuleResult;

export type Failed = (message: string) => FailedRuleResult;

export type RuleError = {
    namespace: Namespace,
    error: string
}
export type AssertHandler = (dragees: Dragee[]) => Report

export const successful: Successful = () => {
    return {pass: true}
}

export const failed: Failed = (message: string) => {
    return {pass: false, message: message}
}

export interface DrageeDependency {
    root: Dragee,
    dependencies: Dragee[]
}

/**
 * Find direct dependancies for a root dragee
 * @param root 
 * @param allDragees 
 * @returns 
 */
export const directDependencies = (root: Dragee, allDragees: Dragee[]) => {
    if (!root.depends_on) {
        return {root, dependencies: []};
    }

    const dependencies = Object.keys(root.depends_on)
        .map(dependency => allDragees.find(dragee => dragee.name === dependency))
        .filter((dragee): dragee is Dragee => dragee !== undefined);

    return {root, dependencies}
}

/**
 * Rules scanning in asserter directory
 * @returns rules found in dir
 */
export const findRules = (dir: string) : Rule[] => {
    const scan = new Glob(`*.rule.ts`).scanSync({
        cwd: dir,
        absolute: true,
        onlyFiles: true
    });

    return Array.from(scan)
        .map(file => require(file).default)
        .filter(rule => rule && rule instanceof Rule);
}

/**
 * Asserter class => namespace, rules and built-in handler
 */
export class Asserter {
    readonly namespace!: Namespace
    readonly rules!: Rule[]

    constructor(namespace: string, rules: Rule[]) {
        this.namespace = namespace;
        this.rules = rules;
    }

    readonly handler: AssertHandler = (dragees: Dragee[]): Report => {
        const rulesResultsErrors = this.rules
            .flatMap(rule => rule.handler(dragees))
            .filter((result): result is FailedRuleResult => !result.pass)
            .map(result => result.message);
    
        return {
            pass: rulesResultsErrors.length === 0,
            namespace: this.namespace,
            errors: rulesResultsErrors,
            stats: {
                errorsCount: rulesResultsErrors.length,
                passCount: this.rules.length - rulesResultsErrors.length,
                rulesCount: this.rules.length
            }
        }
    }
}

/**
 * Rule class => label and handler
 */
export class Rule {
    readonly label!: string
    readonly handler!: (dragees: Dragee[]) => RuleResult[]

    constructor(label: string, handler: (dragees: Dragee[]) => RuleResult[]) {
        this.label = label;
        this.handler = handler;
    }
}

/**
 * Expect a dragee to follow a unique dragee eval rule
 * @param dragee 
 * @param errorMsg 
 * @param evalFn 
 * @returns RuleResult success/fail
 */
export const expectDragee = (dragee: Dragee, errorMsg: string, evalFn: (dragee: Dragee) => boolean): RuleResult =>
    evalFn(dragee) ? successful() : failed(errorMsg)

/**
 * Expect multiple dragees to follow a multiple dragee eval rule
 * @param dragee 
 * @param errorMsg 
 * @param evalFn 
 * @returns RuleResult success/fail
 */
export const expectDragees = (dragees: Dragee[], errorMsg: string, evalFn: (dragees: Dragee[]) => boolean): RuleResult =>
    evalFn(dragees) ? successful() : failed(errorMsg)

/**
 * Expect multiple dragees to follow a unique dragee eval rule
 * @param dragee 
 * @param errorMsg 
 * @param evalFn 
 * @returns RuleResult success/fail
 */
export const multipleExpectDragees = (dragees: Dragee[], errorMsg: string, evalFn: (dragee: Dragee) => boolean): RuleResult[] =>
    dragees.map(d => evalFn(d) ? successful() : failed(errorMsg))