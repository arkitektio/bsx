import {describe, expect, it} from 'vitest';
import corpus from '../spec/bsx_v2.json';
import {blokView, defaultBlokView, parseSpecCatalog, type BlokView} from '../spec/catalogs';
import {resolveBlokScope} from './infer';
import {parseBsx} from './parse';
import {checkBlokTree, dependencyHint, emptyBlokScope, type BlokCheckScope} from './references';

type CorpusScope = Omit<BlokCheckScope, 'module'> & {catalog?: boolean; module?: unknown};
type CheckedCase = {
  name: string;
  source: string;
  scope: CorpusScope;
  /** The locals after `resolve_scope`, each kinded: nothing else is resolved. */
  resolved: {locals: unknown[]};
  codes: string[];
};

/** The view a case is checked with: none, the Orkestrator's, or that plus the case's module. */
const caseView = (scope: CorpusScope): BlokView | null => {
  if (scope.catalog === false) return null;
  if (scope.module == null) return defaultBlokView();
  return blokView([parseSpecCatalog(scope.module, 'module')]);
};

const caseScope = (scope: CorpusScope): BlokCheckScope => {
  const {module} = scope;
  const named = typeof module === 'object' && module !== null && 'name' in module && typeof module.name === 'string' ? module.name : null;
  return {...scope, module: named};
};

/** The wire spells "nothing" as null or leaves it out (as bsx.test.ts compares trees). */
const withoutNulls = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutNulls);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== null && entry !== undefined).map(([key, entry]) => [key, withoutNulls(entry)]));
  }
  return value;
};

/** The fields the spec's models dump at their defaults; the resolver leaves them out. */
const PYDANTIC_DEFAULTS: Readonly<Record<string, unknown>> = {
  optional: false,
  auto_resolvable: false,
  allow_inactive: true,
  persist: false,
  nullable: false,
};

const withoutDefaults = (value: unknown): unknown => {
  const plain = withoutNulls(value);
  const strip = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(strip);
    if (entry && typeof entry === 'object') {
      return Object.fromEntries(
        Object.entries(entry)
          .filter(([key, item]) => !(key in PYDANTIC_DEFAULTS && PYDANTIC_DEFAULTS[key] === item))
          .map(([key, item]) => [key, strip(item)]),
      );
    }
    return entry;
  };
  return strip(plain);
};

const checked = (corpus.cases as ReadonlyArray<Record<string, unknown>>).filter(
  (entry): entry is CheckedCase & Record<string, unknown> => 'scope' in entry && 'codes' in entry,
);

describe('the validator against the corpus', () => {
  it('has the checked cases', () => {
    expect(checked.length).toBeGreaterThanOrEqual(50);
  });

  it.each(checked.map(entry => [entry.name, entry] as const))('%s', (_name, entry) => {
    const {tree} = parseBsx(entry.source);
    const view = caseView(entry.scope);
    const findings = checkBlokTree(tree, caseScope(entry.scope), view);
    expect(findings.map(found => found.code).sort()).toEqual([...entry.codes].sort());
  });
});

describe('inference against the corpus', () => {
  it.each(checked.map(entry => [entry.name, entry] as const))('%s', (_name, entry) => {
    const {tree} = parseBsx(entry.source);
    const resolved = resolveBlokScope(tree, caseScope(entry.scope), caseView(entry.scope));
    expect(Object.keys(entry.resolved)).toEqual(['locals']);
    expect(withoutDefaults({locals: resolved.locals})).toEqual(withoutDefaults(entry.resolved));
    // Dependencies are never inferred: they stay as declared.
    expect(resolved.dependencies).toBe(caseScope(entry.scope).dependencies);
  });

  it('is idempotent', () => {
    for (const entry of checked) {
      const {tree} = parseBsx(entry.source);
      const once = resolveBlokScope(tree, caseScope(entry.scope), null);
      const twice = resolveBlokScope(tree, once, null);
      expect(twice).toEqual(once);
    }
  });
});

describe('findings', () => {
  it('name the node and prop they are about, with a filled message', () => {
    const {tree} = parseBsx('<Html><Card><Text text={deps.nope.x} /></Card></Html>');
    const [found] = checkBlokTree(tree, emptyBlokScope('custom'));
    expect(found).toMatchObject({code: 'deps.unknown', level: 'error', nodeId: 'Html[0]/Card[0]/Text[0]', propKey: 'text'});
    expect(found.message).toBe(
      'deps.nope.x: \'nope\' is not a dependency of the blok (its dependencies: none). Fix: dependencies=[AgentDependencyInput(key="nope")].',
    );
  });

  it('hint the declaration a custom blok misses, for a read, a call and a query variable', () => {
    const {tree} = parseBsx('<Html><Card><Text text={queries.positions.status} /><Button onClick={deps.stage.move(x: 1)} /></Card></Html>');
    const scope: BlokCheckScope = {
      ...emptyBlokScope('custom'),
      dependencies: [{key: 'robot'}],
      queries: [{key: 'positions', service: 'mikro', document: 'query { positions { id } }', variables: [{key: 'agent', value_path: 'deps.laser.id'}]}],
    };
    const found = checkBlokTree(tree, scope).filter(finding => finding.code === 'deps.unknown');
    expect(found.map(finding => finding.message).sort()).toEqual([
      'onClick of <Button> (Html[0]/Card[0]/Button[0]): \'stage\' is not a dependency of the blok (its dependencies: robot). Fix: dependencies=[AgentDependencyInput(key="stage")].',
      'deps.laser.id: \'laser\' is not a dependency of the blok (its dependencies: robot). Fix: dependencies=[AgentDependencyInput(key="laser")].',
    ].sort());
  });

  it('hint per kind what a blok reading an undeclared dependency does about it, as the spec does', () => {
    const {tree} = parseBsx('<Html><Text text={deps.laser.power} /></Html>');
    const message = (kind: BlokCheckScope['kind']): string => checkBlokTree(tree, emptyBlokScope(kind))[0]?.message ?? '';
    expect(message('custom')).toContain('Fix: dependencies=[AgentDependencyInput(key="laser")].');
    expect(message('task')).toContain('Fix: dependencies=[AgentDependencyInput(key="laser")].');
    expect(message('action')).toContain('Fix: add a dependency parameter `laser` to the action.');
    // An agent blok has no deps root at all (roots.not_in_kind), so only the spec's wording is ported.
    expect(dependencyHint('laser', 'agent')).toBe('agent bloks read only `self`');
  });

  it('scope a let to its loop and an into name to the whole tree', () => {
    const {tree} = parseBsx(
      '<Html><Card><foreach items={args.xs} let="p" key={p.id}><Button onClick={self.go(to: p.id) into run} /></foreach><Text text={run.status} /></Card></Html>',
    );
    expect(checkBlokTree(tree, emptyBlokScope('agent'))).toEqual([]);
  });

  it('fill the bind and argument kind messages', () => {
    const {tree} = parseBsx('<Html><Card><Switch bind={count} /><Button onClick={self.go(to: count)} /></Card></Html>');
    const scope: BlokCheckScope = {
      ...emptyBlokScope('agent'),
      dependencies: [{key: 'self', action_dependencies: [{key: 'go', demand: {arg_matches: [{key: 'to', kind: 'BOOL'}]}}]}],
      locals: [{key: 'count', kind: 'INT', default: 1}],
    };
    const findings = checkBlokTree(tree, scope);
    expect(findings.map(found => found.code)).toEqual(['local.bind_kind', 'local.arg_kind']);
    expect(findings[0]).toMatchObject({nodeId: 'Html[0]/Card[0]/Switch[0]', propKey: 'bind'});
    expect(findings[0].message).toBe('bind of <Switch> writes a BOOL, but count is a INT local (a BOOL control writes BOOL).');
    expect(findings[1].message).toBe('self.go: to takes a BOOL, but count is a INT local.');
  });

  it('bind error only inside an error slot', () => {
    const {tree} = parseBsx('<Html><suspense><error><Alert>{error.message}</Alert></error><Text /></suspense></Html>');
    expect(checkBlokTree(tree, emptyBlokScope('agent'))).toEqual([]);
  });
});

describe('what an assign blok places and reads of the run it prepares', () => {
  const codes = (source: string, scope: BlokCheckScope) => checkBlokTree(parseBsx(source).tree, scope).map(found => found.code);
  const assign = {...emptyBlokScope('assign'), args: ['image', 'exposure']};

  it('reads assign.given.<key>, assign.missing and assign.ready', () => {
    const source =
      '<Html><if when={assign.given.image}><Text text={args.image} /></if><arg key="exposure" /><args /><deps /><Button onClick={assign.start()} disabled={!assign.ready}>Run</Button></Html>';
    expect(codes(source, assign)).toEqual([]);
  });

  it('refuses a given flag for an argument the action has not, and a field assign has not', () => {
    expect(codes('<Html><Text text={assign.given.nope} /></Html>', assign)).toEqual(['args.unknown']);
    expect(codes('<Html><Text text={assign.nope} /></Html>', assign)).toEqual(['path.unknown']);
  });

  it('keeps <arg>, <deps>, <dep> and the assign root to an assign blok', () => {
    const task = emptyBlokScope('task');
    expect(codes('<Html><arg key="image" /></Html>', task)).toEqual(['assign.kind']);
    expect(codes('<Html><deps /><dep key="robot" /></Html>', task)).toEqual(['assign.kind', 'assign.kind']);
    expect(codes('<Html><Text text={assign.ready} /></Html>', task)).toEqual(['roots.not_in_kind']);
  });
});

describe('what a blok does to the task it is about', () => {
  const codes = (source: string, scope: BlokCheckScope) => checkBlokTree(parseBsx(source).tree, scope).map(found => found.code);

  it('cancels, pauses, resumes, steps and interrupts it, and reads whether it may', () => {
    const source =
      '<Html><Button onClick={task.cancel()} disabled={!task.can.cancel}>Stop</Button><Button onClick={task.pause()}>Pause</Button><Button onClick={task.resume()}>Resume</Button><Button onClick={task.step()}>Step</Button><Button onClick={task.interrupt()}>Kill</Button><Text text={deps.robot.connected ? task.started_at : task.status} /></Html>';
    const scope = {...emptyBlokScope('action'), dependencies: [{key: 'robot'}]} as BlokCheckScope;
    expect(codes(source, scope)).toEqual([]);
  });

  it('starts no run again: a rerun is the page\'s, never a blok\'s', () => {
    expect(() => parseBsx('<Html><Button onClick={task.rerun()}>Again</Button></Html>')).toThrow(/calls nothing/);
  });

  it('refuses them where there is no task', () => {
    expect(codes('<Html><Button onClick={task.cancel()}>Stop</Button></Html>', emptyBlokScope('assign'))).toEqual(['roots.not_in_kind']);
  });
});

describe('what a blok places of its task, and what it leaves the host', () => {
  const codes = (source: string, scope: BlokCheckScope) => checkBlokTree(parseBsx(source).tree, scope).map(found => found.code);

  it('places the result, the status line and the time slider, and says how much chrome it wants', () => {
    const source = '<Html chrome="none"><status /><returns only="image" /><timeline /><Text text={task.paused ? "waiting" : task.duration} /></Html>';
    expect(codes(source, emptyBlokScope('action'))).toEqual([]);
  });

  it('keeps <returns> and <status> to a blok that has a task', () => {
    expect(codes('<Html><returns /><status /></Html>', emptyBlokScope('assign'))).toEqual(['roots.not_in_kind', 'roots.not_in_kind']);
  });

  it('reads what an assign blok knows of starting', () => {
    expect(codes('<Html><Text text={assign.blocked} /><Button disabled={assign.starting} onClick={assign.start()}>Run</Button></Html>', emptyBlokScope('assign'))).toEqual([]);
  });
});
