import * as React from 'react';
import type {KeyedStore, KeyedStoreOptions} from '../cache/keyedStore';
import {blokPlatform} from '../platform';
import {valueFitsPort} from '../spec/locals';
import {isExplicitId} from '../spec/vocabulary';
import {nodeOfRuntimeId} from '../bsx/declared';
import {LOCALS_ROOT, localNodeOfPath, runtimeIdOfPath, type BlokRuntimeStore} from './runtime';

/**
 * What a blok keeps between openings, on this device only (blok language v2):
 *
 * - **form inputs**: a local declared `<local name="x" default={...} persist />`
 *   remembers the viewer's last input, by its runtime id: the `<local>`'s node
 *   id, plus `@<item key>` per enclosing foreach (one value per item). An
 *   explicit `id=` on the `<local>` keeps it across edits of the tree;
 * - **component state**: a component that offers it as its own BOOL prop
 *   (`<Scene id="main" persist>`, `<Transform id="arm-pose" persist>`) keeps
 *   its interaction state (the camera, the pose) by its id. The language
 *   declares no component persistence: that is each component's business.
 *
 * Nothing reaches a server, so keeping cannot become a channel between
 * clients. Values live in IndexedDB keyed by (hub, user, materialized blok)
 * for the locals (one record, values by runtime id) and (hub, user,
 * materialized blok, component id) for each component, and are written a
 * moment after the last change. A local the blok no longer persists, or a
 * value that no longer fits its port, is dropped when the blok opens.
 */

/** A choice a local's port offers (`ChoiceInput`). */
export type BlokLocalChoice = {value: unknown; label?: string | null; description?: string | null};

/**
 * A local's port, as an action's arg port is declared (`ArgPortInput`): its
 * key (the name the tree reads it by), kind (required), identifier for a
 * structure, nullable, default, children for a list/dict/model, choices.
 */
export type BlokLocalPort = {
  key: string;
  /** `INT FLOAT STRING BOOL ENUM DATE QUANTITY LIST DICT MODEL STRUCTURE ...` */
  kind: string;
  identifier?: string | null;
  nullable?: boolean | null;
  default?: unknown;
  children?: readonly BlokLocalPort[] | null;
  choices?: readonly BlokLocalChoice[] | null;
  label?: string | null;
  description?: string | null;
};

/**
 * A `<local>` (vocabulary `locals`): an arg port plus `persist`, remembering
 * the last input on this device, and `node`, the id of the `<local>` node
 * that declares it.
 */
export type BlokLocal = BlokLocalPort & {node: string; persist?: boolean | null};

/** What is kept for one materialization's locals: values by the local's runtime id (`runtimeIdOf`). */
export type KeptLocals = Record<string, unknown>;

/** Whose a kept record is: the hub and user it was set under, and the materialization. */
export type BlokPersistScope = {hub: string; user: string; materializedBlok: string};

/** A store made by the app's `keyedStore` the first time it is used: after the app configured it. */
const lazyKeyedStore = <T,>(options: KeyedStoreOptions<T>): KeyedStore<T> => {
  let store: KeyedStore<T> | null = null;
  const made = () => (store ??= blokPlatform().keyedStore(options));
  return {
    load: (id, hash) => made().load(id, hash),
    save: (id, hash, value) => made().save(id, hash, value),
    forget: id => made().forget(id),
    clear: () => made().clear(),
  };
};

const isKeptLocals = (value: unknown): value is KeptLocals =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Version 2: kept values by runtime id (version 1 kept them by top-level key, and is dropped). */
export const keptLocalsStore: KeyedStore<KeptLocals> = lazyKeyedStore<KeptLocals>({
  db: 'orkestrator-blok-locals',
  store: 'locals',
  version: 2,
  isValue: isKeptLocals,
  label: 'kept blok local',
});

/** One component's kept state, wrapped so any JSON value fits the store. */
export type KeptComponentState = {state: unknown};

const isKeptComponentState = (value: unknown): value is KeptComponentState =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && 'state' in value;

export const keptComponentStore: KeyedStore<KeptComponentState> = lazyKeyedStore<KeptComponentState>({
  db: 'orkestrator-blok-components',
  store: 'components',
  version: 1,
  isValue: isKeptComponentState,
  label: 'kept blok component state',
});

/** keyedStore's "hash": a record is always the current one, its contents are checked on reading. */
const LOCALS_RECORD = 'locals';
const COMPONENT_RECORD = 'component';

export const keptLocalsId = (scope: BlokPersistScope): string =>
  JSON.stringify([scope.hub, scope.user, scope.materializedBlok]);

export const keptComponentId = (scope: BlokPersistScope, componentId: string): string =>
  JSON.stringify([scope.hub, scope.user, scope.materializedBlok, componentId]);

/** Whether a kept value can stand for a local: it fits the local's port (a kept value that no longer does is dropped). */
export const fitsLocal = (kept: unknown, local: BlokLocal): boolean => {
  // A structure is kept as its reference object or its id.
  if (local.kind === 'STRUCTURE') return kept === null || typeof kept === 'string' || (typeof kept === 'object' && !Array.isArray(kept));
  return valueFitsPort(kept, local);
};

/** What of `record` still stands: the values of persisted locals (by their node) that still fit their port. */
export const keptValuesOf = (record: KeptLocals | null, locals: readonly BlokLocal[]): {values: KeptLocals; dropped: boolean} => {
  const values: KeptLocals = {};
  if (!record) return {values, dropped: false};
  const persisted = new Map(locals.filter(local => local.persist).map(local => [local.node, local] as const));
  for (const [runtimeId, value] of Object.entries(record)) {
    const local = persisted.get(nodeOfRuntimeId(runtimeId));
    if (local && fitsLocal(value, local)) values[runtimeId] = value;
  }
  return {values, dropped: Object.keys(values).length !== Object.keys(record).length};
};

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * One opened materialization's kept locals and component states: what to
 * seed the renderer with, and what writes changes back.
 */
export type BlokPersistence = {
  /** The `<local>` node ids kept on this device (those declared with `persist`): `BlokRenderer`'s `keptLocals`. */
  locals: ReadonlySet<string>;
  /** The kept values to seed the runtime with, before the first render, by runtime id: `BlokRenderer`'s `keptValues`. */
  initial: KeptLocals;
  /** Follows `store`: a change of a kept local is written after `delay`. Returns the detach, which flushes. */
  attach: (store: BlokRuntimeStore) => () => void;
  /** Forgets every kept local and shows the defaults again. */
  resetLocals: () => Promise<void>;
  /** Writes a pending change now. */
  flush: () => Promise<void>;
  /** What components keep by id. */
  components: BlokComponentStateStore;
};

/** Where components keep their own state by id: provided to the tree (`BlokComponentStateContext`). */
export type BlokComponentStateStore = {
  load: (componentId: string) => Promise<unknown>;
  save: (componentId: string, state: unknown) => void;
  forget: (componentId: string) => Promise<void>;
};

/** Where the components of one materialization keep their state by id. */
export const componentStateStore = (
  scope: BlokPersistScope,
  store: KeyedStore<KeptComponentState> = keptComponentStore,
  delay = 400,
): BlokComponentStateStore => {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  return {
    load: async componentId => (await store.load(keptComponentId(scope, componentId), COMPONENT_RECORD))?.state ?? null,
    save: (componentId, state) => {
      const pending = timers.get(componentId);
      if (pending !== undefined) clearTimeout(pending);
      timers.set(
        componentId,
        setTimeout(() => {
          timers.delete(componentId);
          void store.save(keptComponentId(scope, componentId), COMPONENT_RECORD, {state});
        }, delay),
      );
    },
    forget: async componentId => {
      const pending = timers.get(componentId);
      if (pending !== undefined) clearTimeout(pending);
      timers.delete(componentId);
      await store.forget(keptComponentId(scope, componentId));
    },
  };
};

/** The values of the kept locals in `dataModel`, by runtime id: every item's, in a foreach. */
const keptIn = (dataModel: unknown, locals: ReadonlySet<string>): Map<string, unknown> => {
  const found = new Map<string, unknown>();
  const values = (dataModel as Record<string, unknown> | null)?.[LOCALS_ROOT];
  if (typeof values !== 'object' || values === null) return found;
  for (const [segment, value] of Object.entries(values as Record<string, unknown>)) {
    const runtimeId = runtimeIdOfPath(`${LOCALS_ROOT}/${segment}`);
    if (runtimeId !== null && locals.has(nodeOfRuntimeId(runtimeId))) found.set(runtimeId, value);
  }
  return found;
};

export const openBlokPersistence = async (options: {
  scope: BlokPersistScope;
  /** The blok's resolved locals (by node); those with `persist` are kept. */
  locals: readonly BlokLocal[];
  store?: KeyedStore<KeptLocals>;
  componentStore?: KeyedStore<KeptComponentState>;
  /** How long after the last change a value is written, in ms. */
  delay?: number;
}): Promise<BlokPersistence> => {
  const store = options.store ?? keptLocalsStore;
  const delay = options.delay ?? 400;
  const id = keptLocalsId(options.scope);
  const persisted = options.locals.filter(local => local.persist);
  const locals = new Set(persisted.map(local => local.node));
  const defaults = new Map(options.locals.map(local => [local.node, local.default ?? null] as const));
  const record = locals.size > 0 ? await store.load(id, LOCALS_RECORD) : null;
  const {values: initial, dropped} = keptValuesOf(record, persisted);
  if (dropped) {
    await (Object.keys(initial).length > 0 ? store.save(id, LOCALS_RECORD, initial) : store.forget(id));
  }

  let kept: KeptLocals = {...initial};
  let timer: ReturnType<typeof setTimeout> | undefined;
  let runtime: BlokRuntimeStore | undefined;

  const write = async () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    await (Object.keys(kept).length > 0 ? store.save(id, LOCALS_RECORD, {...kept}) : store.forget(id));
  };

  const schedule = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => void write(), delay);
  };

  return {
    locals,
    initial,
    attach: target => {
      runtime = target;
      let seen = keptIn(target.getState().dataModel, locals);
      const unsubscribe = target.subscribe(state => {
        const now = keptIn(state.dataModel, locals);
        let changed = false;
        for (const runtimeId of new Set([...seen.keys(), ...now.keys()])) {
          const value = now.get(runtimeId);
          if (same(value, seen.get(runtimeId))) continue;
          // Back at the default (or cleared) is nothing to keep.
          if (value === undefined || same(value, defaults.get(nodeOfRuntimeId(runtimeId)))) {
            if (!(runtimeId in kept)) continue;
            delete kept[runtimeId];
          } else {
            kept[runtimeId] = value;
          }
          changed = true;
        }
        seen = now;
        if (changed) schedule();
      });
      return () => {
        unsubscribe();
        if (runtime === target) runtime = undefined;
        if (timer !== undefined) void write();
      };
    },
    resetLocals: async () => {
      kept = {};
      const state = runtime?.getState();
      if (state) {
        for (const path of Object.keys(state.runtimePathValues)) {
          const node = localNodeOfPath(path);
          if (node !== null && locals.has(node)) state.clearRuntimeValue(path);
        }
      }
      await write();
    },
    flush: async () => {
      if (timer !== undefined) await write();
    },
    components: componentStateStore(options.scope, options.componentStore ?? keptComponentStore, delay),
  };
};

/* -------------------------------------------------------------------------- */
/* Component state, by stable id                                              */
/* -------------------------------------------------------------------------- */

/** Where a persisting component keeps its state; absent (a preview, nobody signed in): it keeps nothing. */
export const BlokComponentStateContext = React.createContext<BlokComponentStateStore | null>(null);

export type PersistedComponentState<T> = {
  /** False until what was kept has been read; a component waits for it before it starts. */
  loaded: boolean;
  /** What was kept, if it still fits; null otherwise. */
  initial: T | null;
  /** Keeps a new state (written a moment later). */
  save: (state: T) => void;
};

/**
 * The state a `persist` component kept, by its explicit id (`<Scene id="main"
 * persist>`). Without `persist`, an explicit id or a store, it keeps nothing
 * and is loaded at once.
 */
export const usePersistedComponentState = <T,>(
  componentId: string,
  persist: boolean,
  isState: (value: unknown) => value is T,
): PersistedComponentState<T> => {
  const store = React.useContext(BlokComponentStateContext);
  const active = persist && store !== null && isExplicitId(componentId);
  const [loaded, setLoaded] = React.useState<{id: string; state: T | null} | null>(null);
  const isStateRef = React.useRef(isState);
  React.useEffect(() => {
    isStateRef.current = isState;
  });

  React.useEffect(() => {
    if (!active || !store) return;
    let cancelled = false;
    store.load(componentId).then(
      state => {
        if (!cancelled) setLoaded({id: componentId, state: isStateRef.current(state) ? state : null});
      },
      () => {
        if (!cancelled) setLoaded({id: componentId, state: null});
      },
    );
    return () => {
      cancelled = true;
    };
  }, [active, componentId, store]);

  const save = React.useCallback(
    (state: T) => {
      if (active && store) store.save(componentId, state);
    },
    [active, componentId, store],
  );

  if (!active) return {loaded: true, initial: null, save};
  const current = loaded?.id === componentId ? loaded : null;
  return {loaded: current !== null, initial: current?.state ?? null, save};
};
