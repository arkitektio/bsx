// What tsc leaves undone for a package every runtime can load (Node's ESM loader under vitest,
// Vite, Metro, esbuild):
// - a relative import names its file: `./parse` becomes `./parse.js`, `./runtime` `./runtime/index.js`;
// - an imported JSON file becomes a module (`vocabulary.json.js`, `export default {...}`): Node
//   wants an import attribute for JSON, which Metro's Babel may not parse;
// - the stylesheet and the fixtures only tests import (an app's tests import `logo.fixture.json`
//   too) are copied, and kept as JSON for the `./*.json` export.
import {cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';

const src = new URL('../src/', import.meta.url).pathname;
const dist = new URL('../dist/', import.meta.url).pathname;

const files = (dir, test) =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path, test) : test(name) ? [path] : [];
  });

for (const path of files(src, name => /\.(css|json|glb)$/.test(name))) cpSync(path, join(dist, relative(src, path)));

const RELATIVE = /(\b(?:from|import)\s*\(?\s*)(['"])(\.{1,2}\/[^'"]*)\2/g;
const jsonModules = new Set();

for (const file of files(dist, name => name.endsWith('.js'))) {
  const text = readFileSync(file, 'utf8');
  const next = text.replace(RELATIVE, (whole, lead, quote, spec) => {
    const target = resolve(dirname(file), spec);
    if (spec.endsWith('.json')) {
      jsonModules.add(target);
      return `${lead}${quote}${spec}.js${quote}`;
    }
    if (/\.(js|mjs|cjs)$/.test(spec)) return whole;
    if (existsSync(`${target}.js`)) return `${lead}${quote}${spec}.js${quote}`;
    if (existsSync(join(target, 'index.js'))) return `${lead}${quote}${spec}/index.js${quote}`;
    throw new Error(`${relative(dist, file)}: cannot resolve ${spec}`);
  });
  if (next !== text) writeFileSync(file, next);
}

for (const json of jsonModules) {
  writeFileSync(`${json}.js`, `export default ${readFileSync(json, 'utf8').trim()};\n`);
}
console.log(`finish-build: ${jsonModules.size} JSON modules`);
