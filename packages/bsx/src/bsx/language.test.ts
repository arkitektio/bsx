import {describe, expect, it} from 'vitest';
import {analyzeBsx} from './analyze';
import {completeBsx, hoverBsx, scanCursor, signatureBsx, type BsxEnvironment} from './language';
import {type BlokCheckScope} from './references';

/** Where the blok is mounted: its dependencies and args. What it is and owns is in its text. */
const scope: BlokCheckScope = {
  kinds: [],
  dependencies: [
    {
      key: 'stage',
      action_dependencies: [{key: 'move', demand: {arg_matches: [{key: 'x'}, {key: 'y'}], return_matches: [{key: 'arrived', kind: 'BOOL'}]}}],
      state_dependencies: [{key: 'position', demand: {matches: [{key: 'x', kind: 'FLOAT'}, {key: 'y', kind: 'FLOAT'}]}}],
    },
  ],
  args: ['image'],
};

const env = (overrides: Partial<BlokCheckScope> = {}): BsxEnvironment => ({scope: {...scope, ...overrides}});

/** The `<Blok>` (a panel of `kind`) and its declarations, written before the text under test. */
const prelude = (kind: string): string =>
  `<Blok kind="${kind}" context="panel">` +
  '<local name="speed" kind="INT" default={1} />' +
  '<local name="form" kind="DICT" children={[{key: "name", kind: "STRING"}, {key: "count", kind: "INT"}]} />' +
  '<query name="positions" service="mikro" document="query { positions { id } }" />' +
  '<query name="pages" service="mikro" document="query { pages { id } }" more="pages" />';

/** Completions at `|` in the source as it stands. */
const atRaw = (marked: string, environment = env()) => completeBsx(marked.replace('|', ''), marked.indexOf('|'), environment);
/** Completions at `|` in the source, inside a custom blok (or one of `kind`) that declares two locals and two queries. */
const at = (marked: string, environment = env(), kind = 'custom') => atRaw(`${prelude(kind)}${marked}`, environment);
const labels = (marked: string, environment = env(), kind = 'custom') => at(marked, environment, kind).map(item => item.label);
const rawLabels = (marked: string) => atRaw(marked).map(item => item.label);

describe('scanCursor', () => {
  it('knows where the cursor is', () => {
    expect(scanCursor('<Car', 4)).toMatchObject({kind: 'tag', prefix: 'Car'});
    expect(scanCursor('<Card><Butt', 11)).toMatchObject({kind: 'tag', prefix: 'Butt', stack: [{tag: 'Card'}]});
    expect(scanCursor('<Card className="p-2" ', 22)).toMatchObject({kind: 'attrName', tag: 'Card', prefix: ''});
    expect(scanCursor('<Card cla', 9)).toMatchObject({kind: 'attrName', prefix: 'cla'});
    expect(scanCursor('<Card className="p-2', 20)).toMatchObject({kind: 'attrValue', attr: 'className', value: 'p-2'});
    expect(scanCursor('<Text text={deps.st', 19)).toMatchObject({kind: 'attrExpression', attr: 'text', expression: 'deps.st'});
    expect(scanCursor('<Text>Hi {task.', 15)).toMatchObject({kind: 'textExpression', expression: 'task.', stack: [{tag: 'Text'}]});
    expect(scanCursor('<Card></Ca', 10)).toMatchObject({kind: 'close', prefix: 'Ca', stack: [{tag: 'Card'}]});
    expect(scanCursor('<Card><Text /></Card>', 21)).toMatchObject({kind: 'text', stack: []});
    expect(scanCursor('<!-- <Car', 9)).toEqual({kind: 'none'});
  });

  it('skips nested braces and strings in expressions', () => {
    const source = '<Badge className={{"a}": x}} text={';
    expect(scanCursor(source, source.length)).toMatchObject({kind: 'attrExpression', attr: 'text', expression: ''});
  });

  it('counts attributes written after the cursor as present', () => {
    const cursor = scanCursor('<Text  tone="muted" />', 6);
    expect(cursor.kind === 'attrName' && [...cursor.present]).toEqual(['tone']);
  });
});

describe('completeBsx: components and props', () => {
  it('offers components, text children where they take text', () => {
    const button = at('<Card><Butt|').find(item => item.label === 'Button');
    expect(button?.insertText).toBe('Button>$0</Button>');
    const selectItem = at('<Select><|').find(item => item.label === 'SelectItem');
    expect(selectItem?.insertText).toMatch(/^SelectItem value="\$\{1\}">\$0<\/SelectItem>$/);
  });

  it('offers only what may sit where the cursor is', () => {
    expect(labels('<Scene><|')).toContain('Model');
    expect(labels('<Card><|')).not.toContain('Model');
    expect(labels('<Scene><Model><|')).toContain('OnClick');
    expect(labels('<Scene><|')).not.toContain('OnClick');
    // A blok starts with its <Blok>; what its root holds is what its context takes.
    expect(rawLabels('<|')).toEqual(['Blok']);
    const scene = rawLabels('<Blok kind="agent" context="scene"><|');
    expect(scene).toEqual(expect.arrayContaining(['Scene', 'local', 'query']));
    expect(scene).not.toContain('Space');
    expect(scene).not.toContain('Card');
    expect(rawLabels('<Blok kind="action" context="scene"><|')).toEqual(expect.arrayContaining(['Scene', 'Space']));
    expect(rawLabels('<Blok kind="agent" context="logo"><|')).toContain('Logo');
    expect(rawLabels('<Blok kind="agent" context="logo"><|')).not.toContain('Card');
    expect(rawLabels('<Blok kind="agent" context="panel"><|')).toEqual(expect.arrayContaining(['Card', 'local', 'query']));
    // Queries are children of the <Blok>, nowhere deeper.
    expect(rawLabels('<Blok kind="agent" context="panel"><Card><|')).not.toContain('query');
  });

  it('offers the props not yet set, required first, then id and when', () => {
    const items = labels('<SelectItem disabled |');
    expect(items[0]).toBe('value');
    expect(items).not.toContain('disabled');
    expect(items).toEqual(expect.arrayContaining(['id', 'when']));
    expect(at('<Button |').find(item => item.label === 'onClick')?.insertText).toBe('onClick={${1}}');
  });

  it('offers colour roles, theme variants and the data attributes a component sets', () => {
    const items = labels('<Button className="px-2 |');
    expect(items).toEqual(expect.arrayContaining(['bg-success-soft', 'text-brand', 'data-open:', 'data-[busy]:']));
    expect(labels('<Button className="data-[busy]:|')).toContain('data-[busy]:bg-muted');
    expect(labels('<Badge className={["px-2", task.running && "bg-|')).toContain('bg-warning-soft');
  });

  it('closes the open tag', () => {
    expect(at('<Card></|')).toMatchObject([{insertText: 'Card>'}]);
  });
});

describe('completeBsx: expressions', () => {
  it('offers the roots of the kind, locals, records and namespaces', () => {
    const items = labels('<Text text={|');
    expect(items).toEqual(expect.arrayContaining(['agents', 'args', 'queries', 'viewer', 'speed', 'str', 'true']));
    expect(items).not.toContain('deps');
    expect(items).not.toContain('self');
    expect(items).not.toContain('task');
    expect(items).not.toContain('event');
    expect(labels('<Text text={|', env(), 'agent')).toContain('self');
  });

  it('walks agents: states, tasks, assets, fields, and actions only in callbacks', () => {
    expect(labels('<Text text={agents.|')).toEqual(['stage']);
    expect(labels('<Text text={agents.stage.|')).toEqual(['position', 'tasks', 'assets', 'id', 'name', 'connected']);
    expect(labels('<Button onClick={agents.stage.|')).toContain('move');
    expect(at('<Button onClick={agents.stage.|').find(item => item.label === 'move')?.insertText).toBe('move(x: ${1}, y: ${2})');
    expect(labels('<Text text={agents.stage.position.|')).toEqual(['x', 'y']);
    expect(labels('<Text text={agents.stage.tasks.|')).toEqual(['move']);
    expect(labels('<Text text={agents.stage.tasks.move.|')).toEqual(expect.arrayContaining(['status', 'running', 'returns', 'args']));
    expect(labels('<Text text={agents.stage.tasks.move.returns.|')).toEqual(['arrived']);
  });

  it('offers query records and refetch in a callback', () => {
    expect(labels('<Text text={queries.|')).toEqual(['positions', 'pages']);
    expect(labels('<Text text={queries.positions.|')).toEqual(['status', 'value', 'error', 'refetching', 'fetching_more']);
    expect(labels('<Button onClick={queries.positions.|')).toContain('refetch');
    // fetch_more only of a query that declares `more`.
    expect(labels('<Button onClick={queries.positions.|')).not.toContain('fetch_more');
    expect(labels('<Button onClick={queries.pages.|')).toEqual(expect.arrayContaining(['refetch', 'fetch_more']));
    expect(labels('<Button onClick={query.|')).toEqual(expect.arrayContaining(['refetch', 'fetch_more']));
    expect(labels('<Text text={query.|')).toEqual([]);
  });

  it('offers then, never now, and the fields of a local port', () => {
    const roots = labels('<Text text={|');
    expect(roots).toContain('then');
    expect(roots).not.toContain('now');
    expect(labels('<Input bind={form.|')).toEqual(['name', 'count']);
  });

  it('offers into names, lets and event fields where they are bound', () => {
    expect(labels('<Card><Button onClick={agents.stage.move(x: 1, y: 2) into run} /><Text>{run.|')).toContain('progress');
    expect(labels('<Card><Button onClick={agents.stage.move(x: 1, y: 2) into run} /><Text>{|')).toContain('run');
    expect(labels('<foreach items={args.image} let="p" key={p}><Text text={|')).toContain('p');
    expect(labels('<Slider onChange={agents.stage.move(x: |')).toContain('event');
    expect(labels('<Slider onChange={agents.stage.move(x: event.|')).toEqual(['value']);
    expect(labels('<suspense><error><Text text={|')).toContain('error');
  });

  it('offers functions by namespace, effects only as a callback’s one thing', () => {
    expect(labels('<Text text={str.|')).toEqual(expect.arrayContaining(['upper', 'template', 'classes']));
    expect(labels('<Text text={|')).not.toContain('ui');
    expect(labels('<Button onClick={ui.|')).toEqual(['copy']);
    expect(labels('<Button onClick={task.|', env(), 'task')).toContain('answer');
  });

  it('offers into after a task call', () => {
    expect(labels('<Button onClick={agents.stage.move(x: 1, y: 2) |')).toEqual(['into']);
    expect(labels("<Text text={str.upper('|")).toEqual([]);
  });
});

describe('hover and signatures', () => {
  it('describes the component, prop, function and root under the cursor', () => {
    expect(hoverBsx('<Text tone="muted" />', 2, env())?.contents).toContain('<Text>');
    expect(hoverBsx('<Text tone="muted" />', 7, env())?.contents).toContain('**tone**');
    const source = '<Text text={str.upper(deps.stage.id)} />';
    expect(hoverBsx(source, source.indexOf('upper') + 1, env())?.contents).toContain('str.upper(value)');
    expect(hoverBsx(source, source.indexOf('deps') + 1, env())?.contents).toContain('**deps**');
    expect(hoverBsx('<Time value={then} relative />', 2, env())?.contents).toContain('base@4');
    const then = '<Time value={then} />';
    expect(hoverBsx(then, then.indexOf('then') + 1, env())?.contents).toContain('**then**');
  });

  it('says which parameter of a call the cursor is on', () => {
    const source = '<Text text={str.truncate(task.message, ';
    const signature = signatureBsx(source, source.length, env());
    expect(signature?.label).toBe('str.truncate(value, length, suffix?)');
    expect(signature?.activeParameter).toBe(1);
    const task = '<Button onClick={deps.stage.move(x: 1, y: ';
    expect(signatureBsx(task, task.length, env())).toMatchObject({activeParameter: 1, parameters: [{label: 'x'}, {label: 'y'}]});
  });
});

describe('analyzeBsx', () => {
  const analyze = (source: string, overrides: Partial<BlokCheckScope> = {}) => analyzeBsx(source, {scope: {...scope, ...overrides}});

  it('marks a finding at its prop, with its code', () => {
    const source = '<Blok kind="custom" context="panel"><Text text={agents.stage.speed} /></Blok>';
    const {markers} = analyze(source);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({code: 'deps.unknown_state', severity: 'error'});
    expect(source.slice(markers[0].range.start, markers[0].range.end)).toBe('agents.stage.speed');
  });

  it('marks warnings as warnings', () => {
    const {markers} = analyze('<Blok kind="custom" context="panel"><Badge className="bg-green-500" /></Blok>');
    expect(markers).toMatchObject([{code: 'palette.raw_colour', severity: 'warning'}]);
  });

  it('marks a root that is no <Blok>, and a blok mounted where its kind does not go', () => {
    expect(analyze('<Card />').markers.map(marker => marker.code)).toEqual(['blok.root']);
    expect(analyze('<Blok kind="agent" context="panel"><Card /></Blok>', {kinds: ['action', 'assign']}).markers.map(marker => marker.code)).toEqual(['kind.placement']);
  });

  it('returns no tree for text that does not parse, and the refusal', () => {
    const analysis = analyze('<Card>');
    expect(analysis.tree).toBeNull();
    expect(analysis.markers).toMatchObject([{code: 'bsx.unclosed', severity: 'error'}]);
  });
});
