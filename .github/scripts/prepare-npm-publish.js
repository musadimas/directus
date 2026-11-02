// Renames the public workspace packages to the fork's npm scope right before publishing.
// Internal dependencies become npm aliases (e.g. "@directus/utils": "npm:@slaint.dev/utils@13.4.1-slt.1"),
// so the code keeps importing "@directus/*" and nothing in the source tree has to be renamed.
//
// Usage: node .github/scripts/prepare-npm-publish.js <scope> <repository-url>

/* eslint-disable no-console */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [scope, repositoryUrl] = process.argv.slice(2);

if (!scope?.startsWith('@') || !repositoryUrl) {
	console.error('Usage: node .github/scripts/prepare-npm-publish.js <scope> <repository-url>');
	process.exit(1);
}

// Scaffolding and release tooling that hardcode upstream package names
const skip = new Set(['create-directus-project', 'create-directus-extension', '@directus/release-notes-generator']);

const dependencyFields = ['dependencies', 'optionalDependencies', 'peerDependencies'];

const workspace = JSON.parse(
	execFileSync('pnpm', ['-r', 'ls', '--depth', '-1', '--json'], { encoding: 'utf8', shell: true }),
);

const read = (dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
const write = (dir, manifest) => writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest, null, '\t') + '\n');

const releaseVersion = read('directus').version;
const suffix = releaseVersion.match(/-(slt\.\d+)$/)?.[1];

if (!suffix) {
	console.error(`directus/package.json version ${releaseVersion} has no -slt.N suffix`);
	process.exit(1);
}

const packages = workspace.filter((pkg) => !pkg.private).map((pkg) => ({ ...pkg, manifest: read(pkg.path) }));

const renamed = new Map();

for (const { name, version } of packages) {
	if (skip.has(name)) continue;

	renamed.set(name, {
		name: `${scope}/${name.replace(/^@directus\//, '')}`,
		version: version.endsWith(`-${suffix}`) ? version : `${version}-${suffix}`,
	});
}

for (const { name, path, manifest } of packages) {
	if (skip.has(name)) {
		manifest.private = true;
		write(path, manifest);
		continue;
	}

	const target = renamed.get(name);

	manifest.name = target.name;
	manifest.version = target.version;
	delete manifest.devDependencies;

	for (const field of dependencyFields) {
		for (const [dependency, range] of Object.entries(manifest[field] ?? {})) {
			if (!range.startsWith('workspace:')) continue;

			const alias = renamed.get(dependency);

			if (!alias) {
				console.error(`${name} depends on unpublished workspace package ${dependency}`);
				process.exit(1);
			}

			manifest[field][dependency] = `npm:${alias.name}@${alias.version}`;
		}
	}

	// npm provenance rejects packages whose repository does not match the publishing repo
	manifest.repository = { type: 'git', ...manifest.repository, url: `git+${repositoryUrl}.git` };

	write(path, manifest);
	console.log(`${name} -> ${target.name}@${target.version}`);
}
