// Writes the families of the base catalog as their contracts say them (dist/spec-export/<family>.json), from the
// built contracts. arkitekt-spec's scripts/build_base_catalog.py reads them: the base catalog is the spec's, and a
// component's props and documentation are written here. A changed contract fails `catalogs.test.ts` until the
// spec's base catalog is rebuilt from this export and synced back.
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {baseFamilies, describeBlokContract, specJsonText} from '../dist/catalogs.js';

const into = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'spec-export');
mkdirSync(into, {recursive: true});
for (const contract of baseFamilies) {
  const file = join(into, `${contract.name}.json`);
  writeFileSync(file, specJsonText(describeBlokContract(contract)));
  console.log(file);
}
