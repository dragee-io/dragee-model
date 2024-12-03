import { dag, Container, Directory, object, func } from '@dagger.io/dagger';

@object()
export class DrageeModel {
    @func()
    bun_container(bun_version: string = 'latest'): Container {
        // might be useful to check if the version is in a valid format
        return dag.container().from(`oven/bun:${bun_version}`);
    }

    @func()
    bun_installed(bun_version?: string): Container {
        const bun_binary_location = 'https://bun.sh/install';
        let bun_install_command: string;
        if (bun_version) {
            // might be useluf to check if the version is in a valid format
            bun_install_command = `${bun_binary_location} | bash -s "bun-${bun_version}"`;
        } else {
            bun_install_command = `${bun_binary_location} | bash`;
        }

        console.info(`Installing bun with command: ${bun_install_command}`);

        return (
            dag
                .container()
                .from('alpine:latest')
                .withExec(['apk', 'add', '--no-cache', 'bash', 'curl', 'unzip'])
                .withExec(['curl', '-fsSL', bun_binary_location, '-o', 'install.sh'])
                .withExec(['ls'])
                .withExec(['chmod', '+x', 'install.sh'])
                .withExec(['./install.sh'])
                // .withExec([`curl -fsSL ${bun_binary_location}`])
                .withEnvVariable('PATH', `/root/.bun/bin:$PATH`)
                .withExec(['bun'])
        );
    }

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
