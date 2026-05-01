#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const bump = process.argv[2];
if (!['major', 'minor', 'patch'].includes(bump)) {
    console.error(`Unknown bump type: ${bump}`);
    process.exit(1);
}

const pkgPath = resolve(__dirname, '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

if (bump === 'major') pkg.version = `${major + 1}.0.0`;
else if (bump === 'minor') pkg.version = `${major}.${minor + 1}.0`;
else pkg.version = `${major}.${minor}.${patch + 1}`;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
console.log(`Version bumped to ${pkg.version} (${bump})`);
