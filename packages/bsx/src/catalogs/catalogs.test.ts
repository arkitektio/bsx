import {describe, expect, it} from 'vitest';
import {controlBlokComponents} from '../renderer/bloks/control';
import {BASE_CATALOG_REF, describeBlokContract, type SpecComponentJson} from '../renderer/runtime';
import baseCatalogJson from '../spec/catalogs/base@4.json';
import {baseFamilies} from './index';
import {parts} from './parts';

/** What the spec adds to an entry beside what its contract says: where it is listed, and what the spec alone knows of it. */
const SPEC_OWNED = ['group', 'kinds', 'touch', 'since', 'service'] as const;

type BaseEntry = SpecComponentJson & {group: string};

const shipped = new Map((baseCatalogJson.components as unknown as BaseEntry[]).map(component => [component.name, component]));

const asContract = (entry: BaseEntry): SpecComponentJson =>
  Object.fromEntries(Object.entries(entry).filter(([key]) => !(SPEC_OWNED as readonly string[]).includes(key))) as SpecComponentJson;

describe('the families of the base catalog', () => {
  it('are what the spec\'s base catalog says, component for component', () => {
    for (const family of baseFamilies) {
      expect(family.partOf, family.name).toBe(BASE_CATALOG_REF);
      for (const described of describeBlokContract(family).components) {
        const entry = shipped.get(described.name);
        expect(entry, `<${described.name}> is not in the base catalog: rebuild it from \`pnpm spec:export\``).toBeDefined();
        if (!entry) continue;
        expect(entry.group, described.name).toBe(family.name);
        expect(asContract(entry), described.name).toEqual(described);
      }
    }
  });

  it('hold each component once, and never one the renderer draws itself', () => {
    const own = new Set(controlBlokComponents.map(component => component.name));
    const names = baseFamilies.flatMap(family => Object.keys(family.components));
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
    expect(names.filter(name => own.has(name))).toEqual([]);
  });

  it('are, with what the renderer draws itself, the whole base catalog', () => {
    const drawn = new Set([...baseFamilies.flatMap(family => Object.keys(family.components)), ...controlBlokComponents.map(component => component.name)]);
    expect([...shipped.keys()].filter(name => !drawn.has(name))).toEqual([]);
    expect([...drawn].filter(name => !shipped.has(name))).toEqual([]);
  });

  it('take, where the renderer draws a component itself, the props the base catalog lists', () => {
    for (const component of controlBlokComponents) {
      const entry = shipped.get(component.name);
      expect(entry, component.name).toBeDefined();
      expect(entry?.group === 'language' || entry?.group === 'run', component.name).toBe(true);
      // `children` is a slot where a component takes children; a `<local>`'s is a prop (its child ports).
      const props = Object.keys(component.schema.shape).filter(key => key !== 'children' || !component.acceptsChildren).sort();
      expect(props, component.name).toEqual((entry?.props ?? []).map(prop => prop.key).sort());
    }
  });

  it('use every contract the package defines', () => {
    const used = new Set(baseFamilies.flatMap(family => Object.keys(family.components)));
    expect(Object.keys(parts).filter(name => !used.has(name))).toEqual([]);
  });
});
