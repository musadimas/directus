// Lets release.yml publish every package of the npm scope through trusted publishing (OIDC),
// so no npm token is needed in CI. Run once locally after the packages' first publish, and
// again whenever a new package has been published. Requires npm >= 11.15 and `npm login`.
//
// Usage: node .github/scripts/trust-npm-packages.js <scope> <owner/repo>

/* eslint-disable no-console */

import { execFileSync } from 'node:child_process';

const [scope, repository] = process.argv.slice(2);

if (!scope?.startsWith('@') || !repository?.includes('/')) {
	console.error('Usage: node .github/scripts/trust-npm-packages.js <scope> <owner/repo>');
	process.exit(1);
}

const npm = (args) => execFileSync('npm', args, { encoding: 'utf8', shell: true });

const packages = Object.keys(JSON.parse(npm(['access', 'list', 'packages', scope, '--json']) || '{}'));

if (packages.length === 0) {
	console.error(`No packages found in ${scope}`);
	process.exit(1);
}

let failed = 0;

// npm allows one trust configuration per package, so packages that already have one fail here
for (const name of packages) {
	try {
		npm(['trust', 'github', name, '--file', 'release.yml', '--repo', repository, '--allow-publish', '--yes']);
		console.log(`${name}: trusted ${repository} release.yml`);
	} catch (error) {
		failed++;
		console.error(`${name}: ${error.stderr?.trim() || error.message}`);
	}
}

if (failed > 0) process.exit(1);
