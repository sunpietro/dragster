#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const bump = process.argv[2];
if (!['major', 'minor', 'patch'].includes(bump)) {
    console.error(`Unknown bump type: ${bump}`);
    process.exit(1);
}

const pkgPath = path.resolve(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

if (bump === 'major') pkg.version = `${major + 1}.0.0`;
else if (bump === 'minor') pkg.version = `${major}.${minor + 1}.0`;
else pkg.version = `${major}.${minor}.${patch + 1}`;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Version bumped to ${pkg.version} (${bump})`);
