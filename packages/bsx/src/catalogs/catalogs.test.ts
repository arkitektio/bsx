import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {catalogRef, describeBlokContract, specJsonText} from '../renderer/runtime';
import {globalCatalogs} from './index';
import {parts} from './parts';
import baseCatalogJson from '../spec/catalogs/base@2.json';

const shipped = (ref: string): string => readFileSync(new URL(`../spec/catalogs/${ref}.json`, import.meta.url), 'utf-8');

describe('the global catalogs', () => {
  it('are what the shipped spec JSON says, so `pnpm spec:export` has run', () => {
    for (const contract of globalCatalogs) {
      expect(shipped(catalogRef(contract)), catalogRef(contract)).toBe(specJsonText(describeBlokContract(contract)));
    }
  });

  it('hold each component once, and never one of base@2', () => {
    const base = new Set(baseCatalogJson.components.map(component => component.name));
    const names = globalCatalogs.flatMap(contract => Object.keys(contract.components));
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
    expect(names.filter(name => base.has(name))).toEqual([]);
  });

  it('use every contract the package defines', () => {
    const used = new Set(globalCatalogs.flatMap(contract => Object.keys(contract.components)));
    expect(Object.keys(parts).filter(name => !used.has(name))).toEqual([]);
  });
});
