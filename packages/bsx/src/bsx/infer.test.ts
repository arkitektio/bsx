import {describe, expect, it} from 'vitest';
import {blokView, defaultBlokView, parseSpecCatalog} from '../spec/catalogs';
import {defaultType, portIsValid, resolveLocal, resolveLocals} from './infer';
import {parseBsx} from './parse';
import {printBsx} from './print';
import {checkBlokTree, literalHint, mountedBlokScope, type BlokCheckScope, type BlokScopeDependency} from './references';

const codes = (source: string, scope: BlokCheckScope = mountedBlokScope()): string[] => checkBlokTree(parseBsx(source).tree, scope).map(found => found.code);

/** A panel blok of `kind` around `body`. */
const blok = (kind: string, body: string) => `<Blok kind="${kind}" context="panel">${body}</Blok>`;

const moveTo: BlokScopeDependency = {
  key: 'self',
  action_dependencies: [
    {
      key: 'move_to',
      demand: {
        arg_matches: [
          {key: 'position', kind: 'INT'},
          {key: 'unit', kind: 'QUANTITY'},
          {key: 'speed', kind: 'FLOAT'},
        ],
      },
    },
  ],
};

describe('local kind inference', () => {
  it('reads a default: bool before int, int before float, lists and dicts of one scalar', () => {
    expect(defaultType(true)).toEqual({kind: 'BOOL'});
    expect(defaultType(3)).toEqual({kind: 'INT'});
    expect(defaultType(0.5)).toEqual({kind: 'FLOAT'});
    expect(defaultType('a')).toEqual({kind: 'STRING'});
    expect(defaultType([1, 2])).toEqual({kind: 'LIST', children: [{key: '...', kind: 'INT'}]});
    expect(defaultType({a: 'x'})).toEqual({kind: 'DICT', children: [{key: '...', kind: 'STRING'}]});
    for (const silent of [null, undefined, [], {}, [1, 'a'], [[1]]]) expect(defaultType(silent)).toBeNull();
  });

  it('follows the precedence default, then task argument, then bind', () => {
    const resolved = (body: string, local: string) =>
      [...resolveLocals(parseBsx(blok('agent', `${local}${body}`)).tree, [moveTo], defaultBlokView()).values()][0].local;
    const both = '<Card><Slider bind={p} /><Button onClick={self.move_to(position: p)} /></Card>';
    expect(resolved(both, '<local name="p" />').kind).toBe('INT');
    expect(resolved(both, '<local name="p" default="x" />').kind).toBe('STRING');
    expect(resolved('<Slider bind={p} />', '<local name="p" />').kind).toBe('FLOAT');
    expect(resolved('<Text text={p} />', '<local name="p" />').kind).toBe('ANY');
  });

  it('counts only the uses inside the local\'s scope', () => {
    const tree = parseBsx(blok('agent', '<Card><local name="p" /><Text text={p} /></Card><Card><local name="p" /><Slider bind={p} /></Card>')).tree;
    const kinds = [...resolveLocals(tree, [moveTo], defaultBlokView())].map(([node, {local}]) => [node, local.kind]);
    expect(kinds).toEqual([
      ['Blok[0]/Card[0]/local[0]', 'ANY'],
      ['Blok[0]/Card[1]/local[0]', 'FLOAT'],
    ]);
  });

  it('infers only a kind left out: a given one, ANY included, is kept', () => {
    expect(resolveLocal({key: 'p', kind: 'ANY'}, [{kind: 'INT'}], ['FLOAT']).kind).toBe('ANY');
    expect(resolveLocal({key: 'p', kind: 'STRING', default: 1}, [], []).kind).toBe('STRING');
    expect(resolveLocal({key: 'p', kind: null}, [{kind: 'INT'}], []).kind).toBe('INT');
  });

  it('skips a candidate that makes no valid port', () => {
    expect(portIsValid({kind: 'QUANTITY'})).toBe(false);
    expect(portIsValid({kind: 'STRUCTURE', identifier: '@mikro/image'})).toBe(true);
    expect(resolveLocal({key: 'p'}, [{kind: 'QUANTITY'}, {kind: 'FLOAT'}], []).kind).toBe('FLOAT');
  });

  it('lets an ANY local skip the argument, bind and default checks', () => {
    const scope = mountedBlokScope([], [moveTo]);
    expect(
      codes(blok('agent', '<local name="p" kind="ANY" default="x" /><Card><Switch bind={p} /><Button onClick={self.move_to(position: p)} /><Text text={p.a.b} /></Card>'), scope),
    ).toEqual([]);
  });

  it('checks the remaining sites against the kind found', () => {
    const scope = mountedBlokScope([], [moveTo]);
    expect(codes(blok('agent', '<local name="p" /><Card><Switch bind={p} /><Button onClick={self.move_to(position: p)} /></Card>'), scope)).toEqual(['local.bind_kind']);
  });

  it('never infers a dependency: a custom blok reading an undeclared one is refused', () => {
    const tree = parseBsx(blok('custom', '<Card><Text text={deps.zeta.x} /><Button onClick={deps.alpha.go()} /><Text text={deps.mid.y} /></Card>')).tree;
    const found = checkBlokTree(tree, mountedBlokScope([], [{key: 'mid', state_dependencies: []}]), null);
    expect(found.map(finding => finding.code)).toEqual(['deps.unknown', 'deps.unknown', 'deps.unknown_state']);
    expect(found[0].message).toContain('Fix: dependencies=[AgentDependencyInput(key="zeta")].');
    expect(found[1].message).toContain('Fix: dependencies=[AgentDependencyInput(key="alpha")].');
  });
});

describe('new warnings', () => {
  it('warns a keyless foreach over objects, not over scalars', () => {
    expect(codes(blok('agent', '<foreach items={[{a: 1}]} let="x"><Text>{x.a}</Text></foreach>'))).toEqual(['foreach.position_key']);
    expect(codes(blok('agent', '<foreach items={[1, 2]} let="x"><Text>{x}</Text></foreach>'))).toEqual([]);
    expect(codes(blok('agent', '<foreach items={args.xs} let="x"><Text>{x}</Text></foreach>'))).toEqual([]);
  });

  it('warns reading an unnamed return', () => {
    expect(codes(blok('task', '<Text text={task.returns.return0} />'))).toEqual(['returns.unnamed']);
    expect(codes(blok('task', '<Text text={task.returns.image} />'))).toEqual([]);
  });

  it('hints the literal a string meant', () => {
    expect(literalHint('fullWidth', 'TRUE', 'BOOL')).toBe('fullWidth={true}');
    expect(literalHint('fullWidth', 'yes', 'BOOL')).toBe('fullWidth={true}');
    expect(literalHint('max', '3.7', 'INT')).toBe('max={3}');
    expect(literalHint('max', 'many', 'INT')).toBe('max={0}');
    expect(literalHint('step', '2', 'FLOAT')).toBe('step={2}');
    expect(literalHint('step', '2.0', 'FLOAT')).toBe('step={2.0}');
    expect(literalHint('step', '0.5', 'FLOAT')).toBe('step={0.5}');
    // The spec's literal_hint writes a non-number as 0 (it is whole and has no '.').
    expect(literalHint('step', 'x', 'FLOAT')).toBe('step={0}');
  });
});

describe('a catalog only adds', () => {
  it('refuses one that redefines a component of the base catalog, the language included', () => {
    const redefining = (name: string) => parseSpecCatalog({name: 'mine', components: [{name, context: 'PANEL', props: [{key: 'bind', kind: 'STRING'}]}]}, 'mine');
    expect(() => blokView(redefining('Slider'))).toThrow(/redefines <Slider> of base@4: a catalog only adds/);
    expect(() => blokView(redefining('foreach'))).toThrow(/redefines <foreach>/);
  });

  it('draws what it adds on top of the base', () => {
    const view = blokView(parseSpecCatalog({name: 'mine', components: [{name: 'Gauge', context: 'PANEL', props: []}]}, 'mine'));
    expect(view.components.get('Gauge')?.catalog).toBe('mine');
    expect(view.components.get('Slider')?.catalog).toBe('base@4');
    expect(view.label).toBe('base@4 + mine');
    const found = checkBlokTree(parseBsx(blok('agent', '<Card><Gauge /></Card>')).tree, mountedBlokScope(), view);
    expect(found).toEqual([]);
  });
});

describe('??', () => {
  it('stores a chain as one logic.coalesce and prints it back', () => {
    const {tree} = parseBsx('<Text text={a ?? b ?? c} />');
    expect(tree.props?.[0].util_call).toEqual({
      operation: 'logic.coalesce',
      arguments: [{key: 'values', value_list: [{value_path: 'a'}, {value_path: 'b'}, {value_path: 'c'}]}],
    });
    expect(printBsx(tree)).toBe('<Text text={a ?? b ?? c} />');
    expect(printBsx(parseBsx('<Text>{a ?? b ?? c}</Text>').tree)).toBe('<Text>{a ?? b ?? c}</Text>');
  });

  it('binds looser than || and tighter than a ternary', () => {
    expect(printBsx(parseBsx('<Text>{(a || b) ?? c}</Text>').tree)).toBe('<Text>{a || b ?? c}</Text>');
    expect(printBsx(parseBsx('<Text>{a || (b ?? c)}</Text>').tree)).toBe('<Text>{a || (b ?? c)}</Text>');
    expect(printBsx(parseBsx('<Text>{(a ?? b) ? x : y}</Text>').tree)).toBe('<Text>{a ?? b ? x : y}</Text>');
    expect(printBsx(parseBsx('<Text>{(a ?? b) ?? c}</Text>').tree)).toBe('<Text>{(a ?? b) ?? c}</Text>');
  });
});
