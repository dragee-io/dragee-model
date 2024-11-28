import type { Dragee } from '../common';

export type CustomProfiler<TProfile extends string> = {
    [profile in TProfile]: {
        findIn: (dragees: Dragee[]) => Dragee[];
        is: (profile: string) => boolean;
    };
};

/**
 * This function creates custom a profiler based on the given profiles and a function to check if a dragee match a profile
 *
 * Usage:
 * ```ts
 * const [profiler, profileOf] = generateProfilerWith(['namespace/profile1', 'namespace/profile2']);
 * ```
 * @param profiles an array of profiles
 * @returns an tuple of a profiler and a function to check if a dragee match a profile
 */
export function generateProfilerWith<TProfile extends string>(
    profiles: readonly TProfile[]
): [CustomProfiler<TProfile>, (dragees: Dragee, ...profilesToFilterOn: TProfile[]) => boolean] {
    const profiler = createProfiler<TProfile>(profiles);

    function profileOf(dragee: Dragee, ...profilesToFilterOn: TProfile[]): boolean {
        return profilesToFilterOn.some(pf => profiler[pf].is(dragee.profile));
    }

    return [profiler, profileOf];
}

function createProfiler<TProfile extends string>(profiles: readonly TProfile[]) {
    return profiles.reduce(
        (acc, profile) => {
            acc[profile] = {
                findIn: (dragees: Dragee[]) => dragees.filter(dragee => dragee.profile === profile),
                is: (value: string) => value === profile
            };
            return acc;
        },
        {} as CustomProfiler<TProfile>
    );
}
