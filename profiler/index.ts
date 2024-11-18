import type { Dragee } from '@dragee-io/type';

export type CustomProfiler<TProfile extends string> = {
    [profile in TProfile]: {
        findIn: (dragees: Dragee[]) => Dragee[];
        is: (profile: string) => boolean;
    };
};

export function generateProfilerWith<TProfile extends string>(
    profiles: readonly TProfile[]
): [CustomProfiler<TProfile>, (dragees: Dragee, ...profilesToFilterOn: TProfile[]) => boolean] {
    const profiler = createProfiler<TProfile>(profiles);

    function profileOf(dragee: Dragee, ...profilesToFilterOn: TProfile[]): boolean {
        // TODO: improve this with direct some
        return profilesToFilterOn.map(pf => profiler[pf].is(dragee.profile)).some(b => b);
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
