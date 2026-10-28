import {describe, expect, it} from 'vitest';
import * as z from 'zod';
import {catalogRef, defineBlokCatalog, implementBlokCatalog, type BlokRender} from './catalog';
import {describeBlokContract} from './describe';
import {actionProp, bindSchema} from '../../catalogs/props';

const contract = defineBlokCatalog({
  name: 'demo',
  version: 1,
  description: 'Two components.',
  components: {
    Label: {schema: z.object({text: z.string().optional().describe('What it says.')}).describe('A label.'), textProp: 'text'},
    Knob: {
      schema: z
        .object({
          bind: bindSchema,
          level: z.enum(['low', 'high']).optional().describe('How far.'),
          onTurn: actionProp('Runs when turned.'),
        })
        .describe('A knob.'),
      bindKinds: {bind: 'FLOAT'},
      events: {onTurn: [{key: 'value', kind: 'FLOAT', description: 'Where it stands.'}]},
    },
  },
});

const Label: BlokRender<typeof contract.components.Label> = () => null;
const Knob: BlokRender<typeof contract.components.Knob> = () => null;

describe('implementBlokCatalog', () => {
  it('draws every component of the contract, tagged with it', () => {
    const implementation = implementBlokCatalog(contract, {Label, Knob});
    expect(implementation.whole).toBe(true);
    expect(implementation.components.map(component => [component.name, component.origin])).toEqual([
      ['Label', 'demo@1'],
      ['Knob', 'demo@1'],
    ]);
  });

  it('refuses a component left undrawn, unless partial', () => {
    // @ts-expect-error Knob has no render.
    expect(() => implementBlokCatalog(contract, {Label})).toThrow('demo@1 is implemented without Knob');
    const partial = implementBlokCatalog(contract, {Label}, {partial: true});
    expect(partial.whole).toBe(false);
    expect(partial.components.map(component => component.name)).toEqual(['Label']);
  });

  it('refuses a render for a component the contract does not hold', () => {
    // @ts-expect-error Dial is not in the contract.
    expect(() => implementBlokCatalog(contract, {Label, Knob, Dial: Label})).toThrow('demo@1 holds no Dial');
  });

  it('names a UI-owned catalog without a version', () => {
    expect(catalogRef(defineBlokCatalog({name: 'newswitch', description: '', components: {}}))).toBe('newswitch');
  });
});

describe('describeBlokContract', () => {
  it('writes the spec JSON: kinds, values, the bind kind, event fields and the text prop', () => {
    expect(describeBlokContract(contract)).toEqual({
      name: 'demo',
      version: 1,
      description: 'Two components.',
      components: [
        {
          name: 'Knob',
          description: 'A knob.',
          context: 'HTML',
          children_context: null,
          inherits_context: false,
          accepts_children: false,
          downstream_of: [],
          not_downstream_of: [],
          text_prop: null,
          props: [
            {key: 'bind', kind: 'FLOAT', required: false, description: expect.any(String)},
            {key: 'level', kind: 'STRING', required: false, description: 'How far.', values: ['low', 'high']},
            {
              key: 'onTurn',
              kind: 'CALLBACK',
              required: false,
              description: 'Runs when turned.',
              event: [{key: 'value', kind: 'FLOAT', description: 'Where it stands.'}],
            },
          ],
        },
        {
          name: 'Label',
          description: 'A label.',
          context: 'HTML',
          children_context: null,
          inherits_context: false,
          accepts_children: false,
          downstream_of: [],
          not_downstream_of: [],
          text_prop: 'text',
          props: [{key: 'text', kind: 'STRING', required: false, description: 'What it says.'}],
        },
      ],
    });
  });
});
