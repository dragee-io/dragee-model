import { describe, it, expect } from 'bun:test';
import type { Dragee } from '@dragee-io/type';

import { generateProfilerWith } from '../index.ts';

describe('Profiler generation', () => {
    it('should generate a profiler with the correct profiles', () => {
        const defaultProfile = 'namespace/default';
        const testProfile = 'namespace/test';

        const [profiler] = generateProfilerWith([defaultProfile, testProfile]);

        expect(profiler).toEqual({
            'namespace/default': {
                findIn: expect.any(Function),
                is: expect.any(Function)
            },
            'namespace/test': {
                findIn: expect.any(Function),
                is: expect.any(Function)
            }
        });
    });

    it('should find a dragee in a profile', () => {
        const defaultProfile = 'namespace/default';
        const testProfile = 'namespace/test';

        const [_profiler, profileOf] = generateProfilerWith([defaultProfile, testProfile]);

        const dragees: Dragee[] = [
            { name: 'test', profile: 'namespace/default', depends_on: [] },
            { name: 'test', profile: 'namespace/test', depends_on: [] }
        ];

        expect(profileOf(dragees[0], 'namespace/default')).toBe(true);
        expect(profileOf(dragees[0], 'namespace/test')).toBe(false);

        expect(profileOf(dragees[1], 'namespace/test')).toBe(true);
        expect(profileOf(dragees[1], 'namespace/default')).toBe(false);
    });
});
