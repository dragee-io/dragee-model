import {
    dag,
    type GitRef,
    type Container,
    type Directory,
    object,
    func,
    type Secret
} from '@dagger.io/dagger';

const PACKAGE_JSON = 'package.json';
const BUN_LOCKB = 'bun.lockb';

@object()
export class DrageeModel {
    @func()
    bun_container(bun_version = 'latest'): Container {
        // might be useful to check if the version is in a valid format
        // FIXME: check root privileges in the container
        return dag.container().from(`oven/bun:${bun_version}`);
    }

    @func()
    node_container(node_version = 'current-alpine3.21'): Container {
        // FIXME: check root privileges in the container
        return dag.container().from(`node:${node_version}`);
    }

    @func()
    install_dependencies(source: Directory): Container {
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
    mount_app_with(source: Directory): Container {
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
    async test(app: Container): Promise<Container> {
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
    async lint(app: Container): Promise<Container> {
        const linted_app = app.withExec(['bun', 'lint']);

        await linted_app.stdout();
        await linted_app.stderr();

        return linted_app;
    }

    @func()
    async build(source: Directory): Promise<Container> {
        const built_app = this.mount_app_with(source).withExec(['bun', 'run', 'build']);

        await built_app.stdout();
        await built_app.stderr();

        return built_app;
    }

    /**
     * This function runs the lint and test of the project on a pull request trigger
     * @param url - the repository url (it can either be a http or a git url)
     * @param branch - the branch to use - defaults to `main`
     * @returns the linted and tested app
     */
    @func()
    async on_pull_request(url: string, branch = 'main'): Promise<void> {
        const repository_files = this.get_repository(url, branch).tree();

        await this.lint_and_test(repository_files);
    }

    /**
     * This function runs the lint and test of the project (used by `on_pull_request` but can be used to test local changes)
     * @param source the source directory
     * @returns the linted and tested app container
     */
    @func()
    async lint_and_test(source: Directory): Promise<Container> {
        const app = this.mount_app_with(source);

        await this.lint(app);
        await this.test(app);

        return app;
    }

    @func()
    async on_publish(
        npm_token: Secret,
        source?: Directory,
        git_url?: string,
        branch?: string,
        tag?: string
    ): Promise<void> {
        // TODO: test on the ci if with a dummy tag and a dummy package name
        if (!source || (!git_url && !branch)) {
            throw new Error(
                'Either a source directory or a git url and a branch name must be provided'
            );
        }
        const app_files = source ?? this.get_repository(git_url, branch).tree();

        if (!git_url && !tag) {
            throw new Error(
                'Either a git url or a tag must be provided to be able to apply a version update'
            );
        }
        const tag_update = await this.get_tag(tag, git_url);

        await this.lint_and_test(app_files);

        await this.build_and_publish(npm_token, app_files, tag_update);

        // return app;
        // pulling the git tags
        // return {files: dag.git(url).head().tree(),
        //     tags: await dag.git(url).tags(),
        // }
        // const tags = (await dag.git(url).tags())
        // return `Tags: ${tags.join(', ')} | Number of tags: ${tags.length}`;
    }

    async get_tag(tag: string, git_url: string): Promise<string> {
        const retrieved_tag = tag ?? (await this.get_latest_tag(git_url));

        if (retrieved_tag.startsWith('v')) {
            return retrieved_tag.slice(1);
        }

        return retrieved_tag;
    }

    @func()
    async build_and_publish(npm_token: Secret, source: Directory, tag: string): Promise<Container> {
        const built_app = await this.build(source);
        // would be nice to kind of "compose" the directory to select what will be published rather than everything that is not excluded by the .gitignore
        const built_files = built_app.directory('.');

        const updated_version_app = await this.update_app_version(tag, built_files);
        const published_app = await this.publish(updated_version_app, npm_token);
        return published_app;
    }

    @func()
    async publish(app: Container, npm_token: Secret): Promise<Container> {
        const published_app = app
            .withSecretVariable('NPM_TOKEN', npm_token)
            .withExec(['npm', 'publish', '--access', 'public']);

        await published_app.stdout();
        await published_app.stderr();

        return published_app;
    }

    @func()
    async update_app_version(version: string, source: Directory): Promise<Container> {
        const updated_app_version = this.node_container()
            .withDirectory('/app', source)
            .withWorkdir('/app')
            .withExec([
                'npm',
                'version',
                version,
                '--commit-hooks',
                'false',
                '--git-tag-version',
                'false'
            ]);

        await updated_app_version.stdout();
        await updated_app_version.stderr();

        return updated_app_version;
    }

    get_repository(url: string, branch = 'main'): GitRef {
        const repo = dag.git(url).branch(branch);

        return repo;
    }

    @func()
    async get_latest_tag(url: string): Promise<string> {
        const tags = await dag.git(url).tags();

        return tags.at(-1);
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
