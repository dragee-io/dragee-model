import { describe, it, expect } from 'bun:test';
import type { Dragee } from '../../common';
import type { Equals } from '../../test-utils';

import { generateProfilerWith, type CustomProfiler } from '../index.ts';

describe('Profiler generation', () => {
    it('should have an equal type for the generated profiler', () => {
        const profiles = ['namespace/default'] as const;

        type ExpectedProfiler = {
            'namespace/default': {
                findIn: (dragees: Dragee[]) => Dragee[];
                is: (profile: string) => boolean;
            };
        };

        // FIXME: It looks like bun doens'nt support type assertions. You can use the result inferred type to know whether the type is correct or not
        type AreTheSame = Equals<ExpectedProfiler, CustomProfiler<(typeof profiles)[number]>>;
        //   ^?
    });

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
