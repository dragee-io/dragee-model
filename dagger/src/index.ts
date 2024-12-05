import { dag, type Container, type Directory, object, func } from '@dagger.io/dagger';

const PACKAGE_JSON = 'package.json';
const BUN_LOCKB = 'bun.lockb';

@object()
export class DrageeModel {
    @func()
    bun_container(bun_version = 'latest'): Container {
        // might be useful to check if the version is in a valid format
        return dag.container().from(`oven/bun:${bun_version}`);
    }

    @func()
    install_dependencies(source: Directory) {
        const package_json = source.file(PACKAGE_JSON);
        const lockb_file = source.file(BUN_LOCKB);

        return this.bun_container()
            .withWorkdir('/app')
            .withFiles('/app', [package_json, lockb_file])
            .withExec(['bun', 'install']);
    }

    @func()
    app_container(source: Directory) {
        return this.install_dependencies(source)
            .withWorkdir('/app')
            .withMountedDirectory('/app', source);
    }

    /**
     * It runs the tests of the project
     * @param source The directory containing the project to test
     * @returns a container that runs the tests of the project
     */
    @func()
    async test(source: Directory) {
        const tested_app = this.app_container(source).withExec(['bun', 'test']);

        console.log('Tests output:', await tested_app.stdout());
        console.log('Tests error:', await tested_app.stderr());

        return tested_app;
    }

    /**
     * WIP for now, seems there's an error on linting due to biome's dependencies
     * @param source 
     * @returns 
     */
    @func()
    async lint(source: Directory) {
        const linted_app = this.app_container(source).withExec(['bun', 'lint']);

        console.log('Lint output:', await linted_app.stdout());
        console.log('Lint error:', await linted_app.stderr());

        return linted_app;
    }

    

    // @func()
    // bun_installed(bun_version?: string): Container {
    //     const bun_binary_location = 'https://bun.sh/install';
    //     let bun_install_command: string;
    //     if (bun_version) {
    //         // might be useluf to check if the version is in a valid format
    //         bun_install_command = `${bun_binary_location} | bash -s "bun-${bun_version}"`;
    //     } else {
    //         bun_install_command = `${bun_binary_location} | bash`;
    //     }

    //     console.info(`Installing bun with command: ${bun_install_command}`);

    //     return (
    //         dag
    //             .container()
    //             .from('alpine:latest')
    //             .withExec(['apk', 'add', '--no-cache', 'bash', 'curl', 'unzip'])
    //             .withExec(['curl', '-fsSL', bun_binary_location, '-o', 'install.sh'])
    //             .withExec(['ls'])
    //             .withExec(['chmod', '+x', 'install.sh'])
    //             .withExec(['./install.sh'])
    //             // .withExec([`curl -fsSL ${bun_binary_location}`])
    //             .withEnvVariable('PATH', '/root/.bun/bin:$PATH')
    //             .withExec(['bun'])
    //     );
    // }

    // @func()
    // test() {
    //     return dag.container().from('alpine:latest');
    // }

    // /**
    //  * Returns a container that echoes whatever string argument is provided
    //  */
    // @func()
    // containerEcho(stringArg: string): Container {
    //     return dag.container().from('alpine:latest').withExec(['echo', stringArg]);
    // }

    // /**
    //  * Returns lines that match a pattern in the files of the provided Directory
    //  */
    // @func()
    // async grepDir(directoryArg: Directory, pattern: string): Promise<string> {
    //     return dag
    //         .container()
    //         .from('alpine:latest')
    //         .withMountedDirectory('/mnt', directoryArg)
    //         .withWorkdir('/mnt')
    //         .withExec(['grep', '-R', pattern, '.'])
    //         .stdout();
    // }
}
