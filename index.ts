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
    profile: string,
    depends_on: Dependency[]
}
export type Namespace = string;
export type ReportStats = {
    rulesCount: number,
    passCount: number,
    errorsCount: number,
}
export type RuleError = {
    ruleId?: string,
    message: string,
    drageeName: string
}
export type Report = {
    pass: boolean,
    namespace: Namespace,
    errors: RuleError[],
    stats: ReportStats
};
export type SuccessfulRuleResult = {
    ruleId?: string,
    pass: true
}
export type FailedRuleResult = {
    ruleId?: string,
    pass: false,
    error: RuleError
}
export type RuleResult = SuccessfulRuleResult | FailedRuleResult

export type Successful = () => SuccessfulRuleResult;

export type Failed = (dragee: Dragee, message: string) => FailedRuleResult;

export type AssertHandler = (asserter: Asserter, dragees: Dragee[]) => Report

export const successful: Successful = () => {
    return {pass: true}
}

export const failed: Failed = (dragee: Dragee, message: string) => {
    return {pass: false, error: {drageeName: dragee.name, message}}
}

export interface DrageeDependency {
    root: Dragee,
    dependencies: Dragee[]
}

/**
 * Finds direct dependancies for a root dragee
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
 * Adds a generated ID for every rule
 * @param namespace asserter namespace
 * @param dir scanned directory
 * @returns rules found in dir
 */
export const findRules = (namespace: string, dir: string) : Rule[] => {
    const scan = new Glob(`*.rule.ts`).scanSync({
        cwd: dir,
        absolute: true,
        onlyFiles: true
    });

    return Array.from(scan)
        .map(file => require(file).default)
        .filter((rule): rule is DeclaredRule => rule)
        .map(rule => declaredRuleToRule(namespace, rule))
}

export type Asserter = {
    readonly namespace: Namespace,
    readonly rules: Rule[],
}

/**
 * Tests dragees list against the asserter rules, and builds a result report
 * @param asserter Asserter including dragees rules
 * @param dragees Dragees to test against the asserter rules
 * @returns Report of dragees testing
 */
export const asserterHandler: AssertHandler = (asserter: Asserter, dragees: Dragee[]): Report => {
    const rulesResultsErrors = asserter.rules
        .flatMap(rule => rule.handler(dragees).map(result => {
            result.ruleId = rule.id;
            return result;
        }))
        .filter((result): result is FailedRuleResult => !result.pass)
        .map(result => {
            result.error.ruleId = result.ruleId;
            return result.error;
        });

    return {
        pass: rulesResultsErrors.length === 0,
        namespace: asserter.namespace,
        errors: rulesResultsErrors,
        stats: {
            errorsCount: rulesResultsErrors.length,
            passCount: asserter.rules.length - rulesResultsErrors.length,
            rulesCount: asserter.rules.length
        }
    }
}

/**
 * Rule severity
 */
export enum RuleSeverity {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info'
}

export type DeclaredRule = {
    readonly label: string,
    readonly severity: RuleSeverity,
    readonly handler: (dragees: Dragee[]) => RuleResult[]
}

export type Rule = DeclaredRule & { readonly id: string }

const declaredRuleToRule = (namespace: Namespace, rule: DeclaredRule): Rule => {
    return { id: generateRuleId(namespace, rule), ...rule }
}

const generateRuleId = (namespace: Namespace, rule: DeclaredRule) => `${namespace}/${constructRuleId(rule.label)}`

/**
 * Constructs a formatted rule ID from its label  
 * Example :
 * ```
 * Aggregates Allowed Dependencies => aggregates-allowed-dependencies
 * ```
 * @param label rule label
 * @returns formatted ID
 */
const constructRuleId = (label: string) =>
    label.replace(/[".*+?^${}()|[\]]/g, "") // Deleting special characters
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Normalizing and deleting accents
        .toLowerCase() // Lower case
        .trim().replace(/['\\/]/g, " ") // Replacing apostrophes, slashes and backslashes by spaces
        .trim().replace(/\s+/g, "-"); // Replacing spaces by dashes

/**
 * Expects a dragee to follow a unique dragee eval rule
 * @param root Tested dragee, used for the error report
 * @param dragee Assert dragee, parameter of eval function
 * @param errorMsg Error message
 * @param evalFn Eval function
 * @returns RuleResult success/fail
 */
export const expectDragee = (root: Dragee, dragee: Dragee, errorMsg: string, evalFn: (dragee: Dragee) => boolean): RuleResult =>
    evalFn(dragee) ? successful() : failed(root, errorMsg)

/**
 * Expects multiple dependancies dragees to follow a multiple dragee eval rule
 * @param root Tested dragee, used for the error report
 * @param dragee Assert dragee, parameter of eval function
 * @param errorMsg Error message
 * @param evalFn Eval function
 * @returns RuleResult success/fail
 */
export const expectDragees = (root: Dragee, dependancies: Dragee[], errorMsg: string, evalFn: (dragees: Dragee[]) => boolean): RuleResult =>
    evalFn(dependancies) ? successful() : failed(root, errorMsg)

/**
 * Expects multiple dragees to follow a unique dragee eval rule
 * @param root Tested dragee, used for the error report
 * @param dragee Assert dragee, parameter of eval function
 * @param errorMsg Error message
 * @param evalFn Eval function
 * @returns RuleResult success/fail
 */
export const multipleExpectDragees = (root: Dragee, dragees: Dragee[], errorMsg: string, evalFn: (dragee: Dragee) => boolean): RuleResult[] =>
    dragees.map(d => evalFn(d) ? successful() : failed(root, errorMsg))