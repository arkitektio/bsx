import {describe, expect, it} from 'vitest';
import * as z from 'zod';
import {portToZod} from '../ports/engine/utils';
import {blokPropPort} from '../renderer/runtime/describe';
import {markStructureSchema, markTextSchema} from '../renderer/runtime/schemas';
import {fits} from '../spec/fit';
import {hasOpenNode, portJson, TEXT_PORT, type SpecPort} from '../spec/ports';
import {baseFamilies} from './index';
import {zodToPort} from './zodToPort';

const port = (schema: z.ZodTypeAny): Record<string, unknown> | null => portJson(zodToPort(schema, 'test'));

describe('zodToPort', () => {
  it('reads scalars, choices and dates', () => {
    expect(port(z.string())).toEqual({kind: 'STRING'});
    expect(port(z.number())).toEqual({kind: 'FLOAT'});
    expect(port(z.number().int())).toEqual({kind: 'INT'});
    expect(port(z.int())).toEqual({kind: 'INT'});
    expect(port(z.boolean().optional())).toEqual({kind: 'BOOL'});
    expect(port(z.string().nullable())).toEqual({kind: 'STRING', nullable: true});
    expect(port(z.enum(['a', 'b']))).toEqual({kind: 'STRING', choices: [{value: 'a'}, {value: 'b'}]});
    expect(port(z.literal(3))).toEqual({kind: 'INT', choices: [{value: 3}]});
    expect(port(z.iso.date())).toEqual({kind: 'DATE'});
  });

  it('reads containers', () => {
    expect(port(z.array(z.number()))).toEqual({kind: 'LIST', children: [{key: '...', kind: 'FLOAT'}]});
    expect(port(z.record(z.string(), z.boolean()))).toEqual({kind: 'DICT', children: [{key: '...', kind: 'BOOL'}]});
    expect(port(z.object({a: z.string().describe('A.'), b: z.number().optional()}))).toEqual({
      kind: 'MODEL',
      children: [
        {key: 'a', kind: 'STRING', description: 'A.'},
        {key: 'b', kind: 'FLOAT', nullable: true},
      ],
    });
    expect(port(z.tuple([z.string(), z.number()]))).toEqual({
      kind: 'LIST',
      children: [{key: '...', kind: 'UNION', children: [{key: '0', kind: 'STRING'}, {key: '1', kind: 'FLOAT'}]}],
    });
  });

  it('flattens unions, merges literals and collapses one variant', () => {
    expect(port(z.union([z.string(), z.union([z.number(), z.string()])]))).toEqual({
      kind: 'UNION',
      children: [{key: '0', kind: 'STRING'}, {key: '1', kind: 'FLOAT'}],
    });
    expect(port(z.union([z.literal('a'), z.literal('b')]))).toEqual({kind: 'STRING', choices: [{value: 'a'}, {value: 'b'}]});
    expect(port(z.union([z.string(), z.string()]))).toEqual({kind: 'STRING'});
    expect(port(z.union([z.string(), z.null()]))).toEqual({kind: 'STRING', nullable: true});
  });

  it('takes a mark before the shape', () => {
    expect(port(markTextSchema(z.string().transform(String)).optional().describe('x'))).toEqual(portJson(TEXT_PORT));
    expect(port(markStructureSchema(z.object({object: z.string()}), '*').nullish())).toEqual({kind: 'STRUCTURE', identifier: '*', nullable: true});
  });

  it('throws on a shape no port says, naming where', () => {
    expect(() => zodToPort(z.unknown(), '<X> y')).toThrow(/<X> y/);
    expect(() => zodToPort(z.object({a: z.any()}), '<X> y')).toThrow(/<X> y\.a/);
    expect(() => zodToPort(z.custom(() => true), 'z')).toThrow();
  });

  it('round-trips the ports a form builds (list and dict forms wrap their items: not here)', () => {
    const cases: SpecPort[] = [
      {kind: 'STRING'},
      {kind: 'BOOL', nullable: true},
      {kind: 'INT'},
      {kind: 'FLOAT'},
      {kind: 'MODEL', children: [{key: 'a', kind: 'STRING'}, {key: 'b', kind: 'INT'}]},
    ];
    for (const original of cases) {
      const back = zodToPort(portToZod({key: 'x', ...original} as never), 'round trip');
      expect(fits(back, original).status, JSON.stringify(original)).toBe('ok');
      expect(fits(original, back).status, JSON.stringify(original)).toBe('ok');
    }
  });
});

describe('the families of the base catalog', () => {
  it('type every prop, with no open node anywhere', () => {
    const problems: string[] = [];
    for (const family of baseFamilies) {
      for (const [name, component] of Object.entries(family.components)) {
        for (const [key, schema] of Object.entries(component.schema.shape as Record<string, z.ZodTypeAny>)) {
          if (key === 'children') continue;
          try {
            if (hasOpenNode(blokPropPort(name, key, schema, component))) problems.push(`<${name}> ${key}: open`);
          } catch (error) {
            problems.push((error as Error).message);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
