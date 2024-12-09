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

    // install_dependencies_on(container: Container, source: Directory) {
    //     const package_json = source.file(PACKAGE_JSON);
    //     const lockb_file = source.file(BUN_LOCKB);

    //     return container
    //         .withWorkdir('/app')
    //         .withFiles('/app', [package_json, lockb_file])
    //         .withExec(['bun', 'install']);
    // }

    @func()
    mount_app_with(source: Directory) {
        const node_modules = this.install_dependencies(source).directory('/app/node_modules');

        return this.bun_container()
            .withWorkdir('/app')
            .withMountedDirectory('/app', source)
            .withMountedDirectory('/app/node_modules', node_modules);
    }

    /**
     * It runs the tests of the project
     * @param source The directory containing the project to test
     * @returns a container that runs the tests of the project
     */
    @func()
    // async test(source: Directory) {
    //     const tested_app = this.app_container(source).withExec(['bun', 'test']);
    async test(app: Container) {
        const tested_app = app.withExec(['bun', 'test']);

        await tested_app.stdout();
        await tested_app.stderr();

        return tested_app;
    }

    /**
     * This function runs the lint of the project
     * @param source
     * @returns
     */
    @func()
    async lint(app: Container) {
        const linted_app = app.withExec(['bun', 'lint']);

        await linted_app.stdout();
        await linted_app.stderr();

        return linted_app;
    }

    @func()
    async build(source: Directory) {
        const built_app = this.mount_app_with(source).withExec(['bun', 'run', 'build']);

        console.log('Build output:', await built_app.stdout());
        console.log('Build error:', await built_app.stderr());

        return built_app;
    }

    /**
     * This function runs the lint and test of the project on a pull request trigger
     * @param url the repository url (it can either be a http or a git url)
     * @param {string} [branch="main"] the branch to use - defaults to `main`
     * @returns the linted and tested app
     */
    @func()
    async on_pull_request(url: string, branch = 'main') {
        const repository_files = this.get_repository(url, branch).tree();

        const app = this.mount_app_with(repository_files);

        try {
            await this.lint(app);
        } catch (error) {
            throw new Error('The linter failed', {
                cause: error
            });
        }

        try {
            await this.test(app);
        } catch (error) {
            throw new Error('Tests failed', {
                cause: error
            });
        }
    }

    // @func()
    async publish(source: Directory) {
        //TODO

        // pulling the git tags
        // return {files: dag.git(url).head().tree(),
        //     tags: await dag.git(url).tags(),
        // }
        // const tags = (await dag.git(url).tags())
        // return `Tags: ${tags.join(', ')} | Number of tags: ${tags.length}`;
    }

    get_repository(url: string, branch = 'main') {
        const repo = dag.git(url).branch(branch);

        return repo;
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
