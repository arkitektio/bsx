import {describe, expect, it} from 'vitest';
import * as z from 'zod';
import {threeScene} from '../scene';
import {shadcnExtras, shadcnHtml, shadcnLogo, shadcnUi} from '../shadcn';
import {hostedStructure} from '../ports/structure/index';
import {ORKESTRATOR_CATALOG_ID, parseSpecCatalog} from '../spec/catalogs';
import {addBlokComponents} from './catalog';
import {blokCatalogSpec, declareBlokUi, ownComponentsOf} from './declare';
import {BASE_CATALOG_ADDRESS, createBlokComponent, ownBlokCatalog} from './runtime';

const gauge = createBlokComponent({name: 'Gauge', service: 'lab', schema: z.object({value: z.number().optional().describe('What it reads.')}).describe('A gauge.')}, () => null);

describe('declareBlokUi', () => {
  it('speaks the base catalog in the contexts it draws whole', () => {
    const whole = declareBlokUi({name: 'whole', implements: [shadcnUi, shadcnHtml, shadcnLogo, shadcnExtras, threeScene, hostedStructure]});
    expect(whole.contexts).toEqual(['HTML', 'SCENE', 'LOGO']);
    expect(whole.claims).toEqual(['base@3']);
    const flat = declareBlokUi({name: 'flat', implements: [shadcnUi, shadcnHtml, shadcnLogo, shadcnExtras, hostedStructure]});
    expect(flat.contexts).toEqual(['HTML', 'LOGO']);
    const logos = declareBlokUi({name: 'logos', implements: [shadcnLogo]});
    expect([logos.contexts, logos.claims]).toEqual([['LOGO'], ['base@3']]);
    expect(declareBlokUi({name: 'none', implements: []}).claims).toEqual([]);
  });

  it('publishes what it draws beyond the base catalog as an app catalog', () => {
    const ui = declareBlokUi({
      name: 'lab',
      implements: [shadcnUi, ownBlokCatalog({name: 'lab', version: 1, description: 'A lab.'}, [gauge])],
    });
    expect(ui.claims).toEqual(['lab@1']);
    expect(ownComponentsOf(ui.catalog).map(component => component.name)).toEqual(['Gauge']);
    const undo = addBlokComponents([createBlokComponent({name: 'Dial', schema: z.object({})}, () => null)], ui.catalog);
    const spec = blokCatalogSpec({id: 'https://acme.example/catalogs/lab/v1', name: 'lab', version: 1, description: 'A lab.'}, ui.catalog);
    undo();
    expect([spec.id, spec.version, spec.minor, spec.extends]).toEqual(['https://acme.example/catalogs/lab/v1', 1, 0, BASE_CATALOG_ADDRESS]);
    expect(spec.components.map(component => [component.name, component.service])).toEqual([['Dial', undefined], ['Gauge', 'lab']]);
    const parsed = parseSpecCatalog(spec, 'lab');
    expect(parsed.components.find(component => component.name === 'Gauge')?.service).toBe('lab');
    expect(blokCatalogSpec({id: ORKESTRATOR_CATALOG_ID, name: 'orkestrator', version: 1, extends: BASE_CATALOG_ADDRESS, description: ''}, ui.catalog).extends).toBe(BASE_CATALOG_ADDRESS);
  });
});
