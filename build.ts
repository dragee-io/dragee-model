import Bun from 'bun';

await Bun.build({
    entrypoints: [
        './asserter/index.ts',
        './profiler/index.ts',
        './grapher/index.ts',
        './common/index.ts',
        './test-utils/index.ts'
    ],
    outdir: './dist',
    splitting: true,
    target: 'bun',
    // minify: true,
    sourcemap: 'external'
});
