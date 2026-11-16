import {describe, expect, it} from 'vitest';
import {parseBsx} from '../bsx/parse';
import {declaredLocals, demoModel, parseBlokDeclarations, resolveTreeLocals, treeQueries, treeSubscriptions} from './declarations';

const tree = (source: string) => [parseBsx(source).tree];

describe('parseBlokDeclarations', () => {
  it('reads the locals a service resolved, each by its <local> node', () => {
    const declarations = parseBlokDeclarations({
      vocab: 2,
      resolvedLocals: [
        {node: 'Blok[0]/local[0]', key: 'iterations', kind: 'INT', default: 3, persist: true},
        {node: 'Blok[0]/local[1]', key: 'mode', kind: 'ENUM', choices: [{value: 'fast', label: 'Fast'}], default: 'fast'},
        {node: 'Blok[0]/Card[0]/local[0]', key: 'form', kind: 'DICT', children: [{key: 'name', kind: 'STRING'}]},
        {key: 'nodeless', kind: 'INT'},
        {node: 'Blok[0]/local[2]', key: 'kindless'},
      ],
      demo: {args: {scene: 1}},
    });
    const port = {identifier: null, nullable: false, default: null, children: null, choices: null, label: null, description: null};
    expect(declaredLocals(declarations)).toEqual([
      {...port, node: 'Blok[0]/local[0]', key: 'iterations', kind: 'INT', default: 3, persist: true},
      {...port, node: 'Blok[0]/local[1]', key: 'mode', kind: 'ENUM', default: 'fast', choices: [{value: 'fast', label: 'Fast', description: null}], persist: false},
      {...port, node: 'Blok[0]/Card[0]/local[0]', key: 'form', kind: 'DICT', children: [{...port, key: 'name', kind: 'STRING'}], persist: false},
    ]);
  });

  it('resolves the tree\'s locals when the service sent none, as the server does', () => {
    const declarations = parseBlokDeclarations({
      componentTree: tree(
        '<Blok kind="custom" context="panel"><local name="on" /><local name="count" default={2} /><Card><local name="note" /><Switch bind={on} /><Text text={note} /></Card></Blok>',
      ),
    });
    expect(declarations.resolvedLocals.map(local => [local.node, local.key, local.kind])).toEqual([
      ['Blok[0]/local[0]', 'on', 'BOOL'],
      ['Blok[0]/local[1]', 'count', 'INT'],
      ['Blok[0]/Card[0]/local[0]', 'note', 'ANY'],
    ]);
    expect(resolveTreeLocals([])).toEqual([]);
  });
});

describe('the reads a tree declares', () => {
  it('reads its <query> and <subscription> children, with their <var> variables', () => {
    const roots = tree(
      '<Blok kind="custom" context="panel"><query name="stats" service="mikro" document="query Stats($t: ID) { stats(t: $t) }" poll={5} more="stats.rows"><var key="t" value={args.table} /></query><subscription name="live" service="mikro" document="subscription { live }" keep={3} /><Text /></Blok>',
    );
    expect(treeQueries(roots)).toEqual([
      {key: 'stats', service: 'mikro', document: 'query Stats($t: ID) { stats(t: $t) }', variables: [{key: 't', value_path: 'args.table'}], poll: 5, more: 'stats.rows'},
    ]);
    expect(treeSubscriptions(roots)).toEqual([{key: 'live', service: 'mikro', document: 'subscription { live }', variables: [], keep: 3, history: null}]);
  });

  it('gives a preview its reads answered by the demo', () => {
    const roots = tree('<Blok kind="custom" context="panel"><query name="stats" service="mikro" document="query Stats { stats }" /><Text /></Blok>');
    const model = demoModel(roots, {demo: {queries: {stats: {mean: 2}}}});
    expect(model.queries).toEqual({stats: {status: 'ready', value: {mean: 2}, error: null, refetching: false, fetching_more: false}});
  });
});
