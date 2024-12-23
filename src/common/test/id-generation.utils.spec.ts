import { describe, expect, test } from 'bun:test';
import { generateId } from '../utils/id-generation.utils';

describe('Generate ID from label, for rules and graphs', () => {
    test('assert with empty namespace and label', async () => {
        const generatedId = generateId('', '');
        expect(generatedId).toBe('/');
    });

    test('assert with namespace and simple label', async () => {
        const generatedId = generateId('namespace', 'label');
        expect(generatedId).toBe('namespace/label');
    });

    test('assert with namespace and label with special characters', async () => {
        const generatedId = generateId('namespace', '**label?*+()');
        expect(generatedId).toBe('namespace/label');
    });

    test('assert with namespace and label with uppercase characters, spaces and apostrophes', async () => {
        const generatedId = generateId('namespace', "This'IS/a LaBeL");
        expect(generatedId).toBe('namespace/this-is-a-label');
    });

    test('assert with namespace and label with uppercase characters, cedillas, accents and spaces', async () => {
        const generatedId = generateId('namespace', 'Règle dragée à la française');
        expect(generatedId).toBe('namespace/regle-dragee-a-la-francaise');
    });
});
