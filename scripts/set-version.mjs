// The extension carries the library's version: one release, one number (semantic-release's
// npm plugin sets packages/bsx; this sets packages/vscode).
import {readFileSync, writeFileSync} from 'node:fs';

const version = process.argv[2];
if (!version) throw new Error('usage: set-version.mjs <version>');
const path = new URL('../packages/vscode/package.json', import.meta.url);
const manifest = JSON.parse(readFileSync(path, 'utf8'));
manifest.version = version;
writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
