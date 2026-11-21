import {describe, expect, it} from 'vitest';
import corpus from '../spec/bsx_v2.json';
import {baseBlokView, blokViewFor, type BlokView} from '../spec/catalogs';
import {blokCatalog} from './declared';
import {resolveLocals} from './infer';
import {parseBsx} from './parse';
import {boundScope, checkBlokTree, dependencyHint, mountedBlokScope, type BlokCheckScope} from './references';
import type {BlokComponentNode} from '../renderer/runtime/types';

/** Where a corpus case is checked: the spec's `mount`, and whether a catalog is read at all. */
type CorpusMount = Omit<BlokCheckScope, 'catalog'> & {catalog: boolean};

const scopeOf = (mount: CorpusMount): BlokCheckScope => ({kinds: mount.kinds, dependencies: mount.dependencies, args: mount.args, port: mount.port ?? null, workflows: mount.workflows ?? null});
type CheckedCase = {
  name: string;
  source: string;
  mount: CorpusMount;
  /** Each `<local>` after `resolve_locals`, by node id, kinded: nothing else is resolved. */
  resolved: {locals: Record<string, unknown>};
  codes: string[];
};

/** The view a case is checked with: none (the language alone), else that of the catalog its <Blok> names (the base's for none). */
const caseView = (mount: CorpusMount, tree: BlokComponentNode): BlokView | null => {
  if (mount.catalog === false) return null;
  const catalog = blokCatalog(tree);
  return catalog === null ? baseBlokView() : blokViewFor(catalog);
};

/** The wire spells "nothing" as null or leaves it out (as bsx.test.ts compares trees). */
const withoutNulls = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutNulls);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== null && entry !== undefined).map(([key, entry]) => [key, withoutNulls(entry)]));
  }
  return value;
};

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
  (entry): entry is CheckedCase & Record<string, unknown> => 'mount' in entry && 'codes' in entry,
);

describe('the validator against the corpus', () => {
  it('has the checked cases', () => {
    expect(checked.length).toBeGreaterThanOrEqual(50);
  });

  it.each(checked.map(entry => [entry.name, entry] as const))('%s', (_name, entry) => {
    const {tree} = parseBsx(entry.source);
    const findings = checkBlokTree(tree, scopeOf(entry.mount), caseView(entry.mount, tree));
    expect(findings.map(found => found.code).sort()).toEqual([...entry.codes].sort());
  });
});

describe('inference against the corpus', () => {
  it.each(checked.map(entry => [entry.name, entry] as const))('%s', (_name, entry) => {
    const {tree} = parseBsx(entry.source);
    const resolved = resolveLocals(tree, boundScope(tree, scopeOf(entry.mount)).dependencies, caseView(entry.mount, tree));
    expect(Object.keys(entry.resolved)).toEqual(['locals']);
    const locals = Object.fromEntries([...resolved].map(([node, {local}]) => [node, local]));
    expect(withoutDefaults(locals)).toEqual(withoutDefaults(entry.resolved.locals));
  });
});

/** A panel blok of `kind` around `body`. */
const blok = (kind: string, body: string, attributes = '') => `<Blok kind="${kind}" context="panel"${attributes}>${body}</Blok>`;
/** Mounted with no dependencies: every one it reads is undeclared. */
const mounted = mountedBlokScope();

describe('findings', () => {
  it('name the node and prop they are about, with a filled message', () => {
    const {tree} = parseBsx(blok('custom', '<Card><Text text={agents.nope.x} /></Card>'));
    const [found] = checkBlokTree(tree, mounted);
    expect(found).toMatchObject({code: 'deps.unknown', level: 'error', nodeId: 'Blok[0]/Card[0]/Text[0]', propKey: 'text'});
    expect(found.message).toBe(
      'agents.nope.x: \'nope\' is not a dependency of the blok (its dependencies: none). Fix: dependencies=[AgentDependencyInput(key="nope")].',
    );
  });

  it('hint the declaration a custom blok misses, for a read, a call and a query variable', () => {
    const {tree} = parseBsx(
      blok(
        'custom',
        '<query name="positions" service="mikro" document="query { positions { id } }"><var key="agent" value={agents.laser.id} /></query><Card><Text text={queries.positions.status} /><Button onClick={agents.stage.move(x: 1)} /></Card>',
      ),
    );
    const found = checkBlokTree(tree, mountedBlokScope([], [{key: 'robot'}])).filter(finding => finding.code === 'deps.unknown');
    expect(found.map(finding => finding.message).sort()).toEqual([
      'onClick of <Button> (Blok[0]/Card[0]/Button[0]): \'stage\' is not a dependency of the blok (its dependencies: robot). Fix: dependencies=[AgentDependencyInput(key="stage")].',
      'agents.laser.id: \'laser\' is not a dependency of the blok (its dependencies: robot). Fix: dependencies=[AgentDependencyInput(key="laser")].',
    ].sort());
  });

  it('take what the mount provides as written where the blok is mounted nowhere', () => {
    expect(checkBlokTree(parseBsx(blok('custom', '<Text text={agents.nope.x} /><Button onClick={agents.stage.move(x: 1)} />')).tree)).toEqual([]);
  });

  it('hint per kind what a blok reading an undeclared dependency does about it, as the spec does', () => {
    const message = (kind: string): string => checkBlokTree(parseBsx(blok(kind, `<Text text={${kind === 'custom' ? 'agents' : 'deps'}.laser.power} />`)).tree, mounted)[0]?.message ?? '';
    expect(message('custom')).toContain('Fix: dependencies=[AgentDependencyInput(key="laser")].');
    expect(message('task')).toContain('Fix: dependencies=[AgentDependencyInput(key="laser")].');
    expect(message('action')).toContain('Fix: add a dependency parameter `laser` to the action.');
    // An agent blok's dependencies are in its own tree.
    expect(message('agent')).toContain('Fix: declare it in the blok: <dependencies key="laser" like="self.<action>" />, then read laser.<dependency>.');
    expect(dependencyHint('laser', 'agent')).toBe('declare it in the blok: <dependencies key="laser" like="self.<action>" />, then read laser.<dependency>');
  });

  it('scope a let to its loop and an into name to the whole tree', () => {
    const {tree} = parseBsx(
      blok('agent', '<Card><foreach items={args.xs} let="p" key={p.id}><Button onClick={self.go(to: p.id) into run} /></foreach><Text text={run.status} /></Card>'),
    );
    expect(checkBlokTree(tree, mounted)).toEqual([]);
  });

  it('scope a local to its parent\'s subtree', () => {
    const {tree} = parseBsx(blok('agent', '<Card><local name="open" default={false} /><Switch bind={open} /></Card><Switch bind={open} />'));
    // Outside its scope the name is neither a local to write nor a root to read (as the spec says).
    expect(checkBlokTree(tree, mounted).map(found => [found.code, found.nodeId])).toEqual([['local.unknown', 'Blok[0]/Switch[0]'], ['roots.unknown', 'Blok[0]/Switch[0]']]);
  });

  it('fill the bind and argument kind messages', () => {
    const {tree} = parseBsx(blok('agent', '<local name="count" kind="INT" default={1} /><Card><Switch bind={count} /><Button onClick={self.go(to: count)} /></Card>'));
    const scope = mountedBlokScope([], [{key: 'self', action_dependencies: [{key: 'go', demand: {arg_matches: [{key: 'to', kind: 'BOOL'}]}}]}]);
    const findings = checkBlokTree(tree, scope);
    expect(findings.map(found => found.code)).toEqual(['local.bind_kind', 'local.arg_kind']);
    expect(findings[0]).toMatchObject({nodeId: 'Blok[0]/Card[0]/Switch[0]', propKey: 'bind'});
    expect(findings[0].message).toBe('bind of <Switch> writes a BOOL, but count is a INT local (a BOOL control writes BOOL).');
    expect(findings[1].message).toBe('self.go: to takes a BOOL, but count is a INT local.');
  });

  it('bind error only inside an error slot', () => {
    const {tree} = parseBsx(blok('agent', '<suspense><error><Alert>{error.message}</Alert></error><Text /></suspense>'));
    expect(checkBlokTree(tree, mounted)).toEqual([]);
  });
});

const codes = (source: string, scope: BlokCheckScope = mounted) => checkBlokTree(parseBsx(source).tree, scope).map(found => found.code);

describe('what an assign blok places and reads of the run it prepares', () => {
  const assign = mountedBlokScope([], [], ['image', 'exposure']);

  it('reads assign.given.<key>, assign.missing and assign.ready', () => {
    const source = blok(
      'assign',
      '<if when={assign.given.image}><Text text={args.image} /></if><arg key="exposure" /><args /><deps /><Button onClick={assign.start()} disabled={!assign.ready}>Run</Button>',
    );
    expect(codes(source, assign)).toEqual([]);
  });

  it('refuses a given flag for an argument the action has not, and a field assign has not', () => {
    expect(codes(blok('assign', '<Text text={assign.given.nope} />'), assign)).toEqual(['args.unknown']);
    expect(codes(blok('assign', '<Text text={assign.nope} />'), assign)).toEqual(['path.unknown']);
  });

  it('keeps <arg>, <deps>, <dep> and the assign root to an assign blok', () => {
    expect(codes(blok('task', '<arg key="image" />'))).toEqual(['catalog.kind']);
    expect(codes(blok('task', '<deps /><dep key="robot" />'))).toEqual(['catalog.kind', 'catalog.kind']);
    // The language alone knows no kind of a component: that is the catalog's to say.
    expect(checkBlokTree(parseBsx(blok('task', '<arg key="image" />')).tree, mounted, null)).toEqual([]);
    expect(codes(blok('task', '<Text text={assign.ready} />'))).toEqual(['roots.not_in_kind']);
  });
});

describe('what a blok does to the task it is about', () => {
  it('cancels, pauses, resumes, steps and interrupts it, and reads whether it may', () => {
    const source = blok(
      'action',
      '<Button onClick={task.cancel()} disabled={!task.can.cancel}>Stop</Button><Button onClick={task.pause()}>Pause</Button><Button onClick={task.resume()}>Resume</Button><Button onClick={task.step()}>Step</Button><Button onClick={task.interrupt()}>Kill</Button><Text text={deps.robot.connected ? task.started_at : task.status} />',
    );
    expect(codes(source, mountedBlokScope([], [{key: 'robot'}]))).toEqual([]);
  });

  it('starts no run again: a rerun is the page\'s, never a blok\'s', () => {
    expect(() => parseBsx(blok('action', '<Button onClick={task.rerun()}>Again</Button>'))).toThrow(/calls nothing/);
  });

  it('refuses them where there is no task', () => {
    expect(codes(blok('assign', '<Button onClick={task.cancel()}>Stop</Button>'))).toEqual(['roots.not_in_kind']);
  });
});

describe('what a blok places of its task, and what it leaves the host', () => {
  it('places the result, the status line and the time slider, and says how much chrome it wants', () => {
    const source = blok('action', '<status /><ask /><returns only="image" /><timeline /><Text text={task.paused ? "waiting" : task.duration} />', ' chrome="none"');
    expect(codes(source)).toEqual([]);
  });

  it('warns where no chrome leaves the asks to a blok that places none, and where a part is claimed from inside a branch', () => {
    expect(codes(blok('action', '<status />', ' chrome="none"'))).toEqual(['chrome.no_ask']);
    expect(codes(blok('action', '<if when={task.running}><timeline /></if>'))).toEqual(['part.conditional']);
  });

  it('keeps <returns> and <status> to a blok that has a task', () => {
    expect(codes(blok('assign', '<returns /><status />'))).toEqual(['catalog.kind', 'catalog.kind']);
  });

  it('reads what an assign blok knows of starting', () => {
    expect(codes(blok('assign', '<Text text={assign.blocked} /><Button disabled={assign.starting} onClick={assign.start()}>Run</Button>'))).toEqual([]);
  });
});
