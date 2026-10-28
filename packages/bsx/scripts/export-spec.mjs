// Writes the global catalogs as the spec publishes them (src/spec/catalogs/<name>@<version>.json), from the
// built contracts. The language tooling reads them; arkitekt-spec's scripts/sync_standard_catalog.py copies them.
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {catalogRef, describeBlokContract, globalCatalogs, specJsonText} from '../dist/catalogs.js';

const into = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'spec', 'catalogs');
mkdirSync(into, {recursive: true});
for (const contract of globalCatalogs) {
  const file = join(into, `${catalogRef(contract)}.json`);
  writeFileSync(file, specJsonText(describeBlokContract(contract)));
  console.log(file);
}
