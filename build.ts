import Bun from 'bun';

await Bun.build({
    entrypoints: [
        './src/asserter/index.ts',
        './src/profiler/index.ts',
        './src/grapher/index.ts',
        './src/common/index.ts',
        './src/test-utils/index.ts'
    ],
    outdir: './dist',
    splitting: true,
    target: 'bun',
    // minify: true,
    sourcemap: 'external'
});
