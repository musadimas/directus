// Cuts an SLT release: moves the pending changesets into CHANGELOG-slt.md, sets the
// directus version and deletes the consumed changesets.
//
// Changesets written for this fork end in "-slt.md"; any other changeset came in with an
// upstream backport and is listed under "Backported from upstream".
//
// Usage: node .github/scripts/release-slt.js <version>   (e.g. 11.18.0-slt.2)

/* eslint-disable no-console */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const version = process.argv[2];
const changesetDir = '.changeset';
const changelogPath = 'CHANGELOG-slt.md';
const manifestPath = join('directus', 'package.json');

if (!/^\d+\.\d+\.\d+-slt\.\d+$/.test(version ?? '')) {
	console.error('Usage: node .github/scripts/release-slt.js <major.minor.patch-slt.N>');
	process.exit(1);
}

const changelog = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf8') : '# SLT Changelog\n';

if (changelog.includes(`\n## ${version} `)) {
	console.error(`${version} is already in ${changelogPath}`);
	process.exit(1);
}

const files = readdirSync(changesetDir).filter((file) => file.endsWith('.md') && file !== 'README.md');

if (files.length === 0) {
	console.error(`No changesets found in ${changesetDir}`);
	process.exit(1);
}

const repoUrl = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' })
	.trim()
	.replace(/^git@github\.com:/, 'https://github.com/')
	.replace(/\.git$/, '');

const entries = files.map((file) => {
	const path = join(changesetDir, file);

	const content = readFileSync(path, 'utf8')
		.replace(/^\uFEFF/, '')
		.replace(/\r\n/g, '\n');

	const [, frontmatter = '', summary = ''] = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];

	const packages = [...frontmatter.matchAll(/^['"]?([^'":]+)['"]?:\s*(major|minor|patch)\s*$/gm)].map(
		([, name, bump]) => ({ name, bump }),
	);

	if (packages.length === 0 || !summary.trim()) {
		console.error(`${path} is not a valid changeset`);
		process.exit(1);
	}

	const commit = execFileSync('git', ['log', '--diff-filter=A', '--format=%h', '-1', '--', path], {
		encoding: 'utf8',
	}).trim();

	return { file, path, packages, summary: summary.trim(), commit, slt: file.endsWith('-slt.md') };
});

const formatEntry = ({ packages, summary, commit }) => {
	const names = packages.map(({ name }) => name).join(', ');
	const breaking = packages.some(({ bump }) => bump === 'major') ? '⚠️ ' : '';
	const ref = commit ? ` ([${commit}](${repoUrl}/commit/${commit}))` : '';
	const [first, ...rest] = summary.split('\n');

	return [`- ${breaking}**${names}**: ${first}${ref}`, ...rest.map((line) => (line ? `  ${line}` : ''))].join('\n');
};

const formatGroup = (title, group) =>
	group.length > 0 ? `### ${title}\n\n${group.map(formatEntry).join('\n')}\n` : '';

const date = new Date().toISOString().slice(0, 10);

const sltEntries = entries.filter(({ slt }) => slt);
const upstreamEntries = entries.filter(({ slt }) => !slt);

const section = [
	`## ${version} (${date})\n`,
	formatGroup('SLT', sltEntries),
	formatGroup('Backported from upstream', upstreamEntries),
]
	.filter(Boolean)
	.join('\n');

const [title, ...existing] = changelog.split(/\n(?=## )/);

writeFileSync(changelogPath, [title.trimEnd() + '\n', section, ...existing].join('\n'));
execFileSync('pnpm', ['exec', 'prettier', '--write', changelogPath], { stdio: 'ignore', shell: true });

const manifest = readFileSync(manifestPath, 'utf8');
writeFileSync(manifestPath, manifest.replace(/"version": "[^"]+"/, `"version": "${version}"`));

for (const { path } of entries) unlinkSync(path);

console.log(`Released ${version} with ${entries.length} changeset(s); review ${changelogPath} and commit.`);
