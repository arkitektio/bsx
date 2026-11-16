import * as React from 'react';
import type {BlokScope} from './types';
import {getValueAtPath, splitPathSegments} from './utils';

/** The agent the blok belongs to; `self.x` reads `deps.self.x`. */
export const SELF_ROOT = 'self';

const EMPTY_SCOPE: BlokScope = Object.freeze({
  aliases: Object.freeze({}),
  values: Object.freeze({}),
});

const BlokScopeContext = React.createContext<BlokScope>(EMPTY_SCOPE);

/**
 * Introduces a lexical scope for a subtree (`foreach` iterations, `basePath`
 * children).
 *
 * This deliberately does *not* create a second runtime store. The previous
 * implementation cloned the store per iteration, which meant every write from
 * inside a loop body — a bound `Input`, a live agent-state push — landed on the
 * clone and was invisible to the rest of the surface. Scope is a read/write
 * *addressing* concern, so it lives in context and the store stays singular.
 */
export const BlokScopeProvider = (props: {
  aliases?: Readonly<Record<string, string>>;
  values?: Readonly<Record<string, unknown>>;
  basePath?: string;
  /** What an alias reads before anything was written at its path, by the alias' absolute path (a `<local>`'s default). */
  defaults?: Readonly<Record<string, unknown>>;
  children: React.ReactNode;
}) => {
  const {aliases, values, basePath, defaults, children} = props;
  const parentScope = React.useContext(BlokScopeContext);

  const scope = React.useMemo<BlokScope>(() => {
    if (!aliases && !values && basePath === undefined && !defaults) {
      return parentScope;
    }

    return {
      aliases: aliases ? {...parentScope.aliases, ...aliases} : parentScope.aliases,
      values: values ? {...parentScope.values, ...values} : parentScope.values,
      basePath: basePath ?? parentScope.basePath,
      defaults: defaults ? {...parentScope.defaults, ...defaults} : parentScope.defaults,
    };
  }, [aliases, basePath, defaults, parentScope, values]);

  return <BlokScopeContext.Provider value={scope}>{children}</BlokScopeContext.Provider>;
};

export const useBlokScope = (): BlokScope => React.useContext(BlokScopeContext);

/**
 * Rewrites a scoped path to an absolute data-model path.
 *
 * A named alias wins and consumes the head segment: `item/name` inside
 * `let="item"` aliased to `rows/3` becomes `rows/3/name` — which is what a
 * write has to target. Otherwise a `basePath` prefixes the whole path.
 */
export const resolveScopedPath = (path: string, scope: BlokScope): string => {
  const segments = splitPathSegments(path);
  const [head, ...tail] = segments;

  if (!head) {
    return segments.join('/');
  }

  const aliasedBasePath = scope.aliases[head];
  if (aliasedBasePath) {
    const aliasSegments = splitPathSegments(aliasedBasePath);
    if (aliasSegments[0] === SELF_ROOT) aliasSegments.splice(0, 1, 'deps', SELF_ROOT);
    const normalizedBasePath = aliasSegments.join('/');
    return tail.length > 0 ? `${normalizedBasePath}/${tail.join('/')}` : normalizedBasePath;
  }

  if (head in scope.values) {
    // Addressed by a scope value, which has no path. Callers check
    // `isWritableScopedPath` before treating the result as a write target.
    return segments.join('/');
  }

  // `self` is shorthand for `deps.self`: the agent the blok belongs to.
  if (head === SELF_ROOT) {
    return ['deps', SELF_ROOT, ...tail].join('/');
  }

  if (scope.basePath) {
    return [...splitPathSegments(scope.basePath), ...segments].join('/');
  }

  return segments.join('/');
};

/**
 * Reads a scoped path. An alias wins over a scope value, because an alias is
 * backed by the live data model while a value is a snapshot handed down by the
 * enclosing component (the only option when the items came from a literal or a
 * util call and therefore have no address).
 */
export const readScopedPath = (
  dataModel: unknown,
  path: string,
  scope: BlokScope,
): unknown => {
  const segments = splitPathSegments(path);
  const [head, ...tail] = segments;

  if (head && !(head in scope.aliases) && head in scope.values) {
    return getValueAtPath(scope.values[head], tail.join('/'));
  }

  const aliased = head ? scope.aliases[head] : undefined;
  if (aliased !== undefined && scope.defaults && aliased in scope.defaults && getValueAtPath(dataModel, aliased) === undefined) {
    // Nothing written at the alias yet (a local before its first input): it reads its default.
    return getValueAtPath(scope.defaults[aliased], tail.join('/'));
  }

  return getValueAtPath(dataModel, resolveScopedPath(path, scope));
};

/**
 * Where a write of `path` lands, and what to write first so it lands on the
 * value it was read as: a write below an alias that still reads its default
 * (`bind={p.x}` on a dict local) seeds the default at the alias first.
 */
export const scopedWrite = (
  dataModel: unknown,
  path: string,
  scope: BlokScope,
): {path: string; seed: {path: string; value: unknown} | null} => {
  const [head, ...tail] = splitPathSegments(path);
  const aliased = head ? scope.aliases[head] : undefined;
  const absolute = resolveScopedPath(path, scope);
  if (aliased === undefined || tail.length === 0 || !scope.defaults || !(aliased in scope.defaults)) return {path: absolute, seed: null};
  if (getValueAtPath(dataModel, aliased) !== undefined) return {path: absolute, seed: null};
  const value = scope.defaults[aliased];
  return {path: absolute, seed: value === null || value === undefined ? null : {path: aliased, value: structuredClone(value)}};
};

/** True when a path can be written back through the data model. */
export const isWritableScopedPath = (path: string, scope: BlokScope): boolean => {
  const [head] = splitPathSegments(path);
  if (!head) {
    return false;
  }

  return head in scope.aliases || !(head in scope.values);
};

export {EMPTY_SCOPE};
