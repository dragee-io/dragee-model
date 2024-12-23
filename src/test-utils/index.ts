import { expect, test } from 'bun:test';

import { generateReportForRule } from '../asserter';
import type { Dragee } from '../common';
import type { Asserter } from '../asserter';

export interface TestObject {
    dragees: Dragee[];
    result: {
        pass: boolean;
        errors: string[]; // FIXME: should be an object with the error details and not a string
    };
}

/**
 * Function to create an assertion for a passed rule
 * @param asserter the asserter to test on
 * @param retrieveData a function to retrieve the data to test
 * @returns a function to test a passed rule
 */
export function createRulePassedOnAsserter(
    asserter: Asserter,
    retrieveData: (resultFileToTest: string) => TestObject
) {
    return function rulePassed(resultFilePathToTest: string, rule: string) {
        test('Rule passed', () => {
            const data = retrieveData(resultFilePathToTest);
            const report = generateReportForRule(asserter, data.dragees, rule);
            expect(report.pass).toBe(data.result.pass);
            expect(report.errors).toHaveLength(0);
        });
    };
}

/**
 * Function to create an assertion for a failed rule
 * @param asserter the asserter to test on
 * @param retrieveData a function to retrieve the data to test
 * @returns a function to test a failed rule
 */
export function createRuleFailedOnAsserter(
    asserter: Asserter,
    retrieveData: (resultFileToTest: string) => TestObject
) {
    return function ruleFailed(resultFilePathToTest: string, rule: string) {
        test('Rule failed', () => {
            const data: TestObject = retrieveData(resultFilePathToTest);
            const report = generateReportForRule(asserter, data.dragees, rule);

            expect(report.pass).toBe(data.result.pass);
            for (const error of data.result.errors) {
                expect(JSON.stringify(report.errors)).toContain(JSON.stringify(error));
            }
        });
    };
}

/**
 * Custom type to check if two types are equals
 */
export type Equals<Left, Right> = (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right
    ? 1
    : 2
    ? true
    : false;
