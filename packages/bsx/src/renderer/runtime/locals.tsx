import * as React from 'react';
import {runtimeIdOf, nodeOfRuntimeId} from '../../bsx/declared';

export {runtimeIdOf, nodeOfRuntimeId};
import {BlokScopeProvider} from './scope';
import type {BlokComponentNode} from './types';
import {splitPathSegments} from './utils';

/**
 * Where a blok's `<local>` values live while it is open (blok language v2
 * `locals.scope`).
 *
 * A `<local>` is in scope in its parent's subtree. Its value lives in the one
 * runtime store under its *runtime id*: its node id plus one `@<item key>` per
 * enclosing `foreach`, outermost first (`runtimeIdOf`), so inside a foreach
 * every item has a value of its own. The value sits at `$locals/<runtime id,
 * encoded as one path segment>`: a root no name a blok writes can be (`into`
 * names are identifiers). It outlives an `if` branch closing, as long as the
 * blok stays open. Until something writes it, it reads its default.
 *
 * When a node renders its children, its `local` children are provided to them
 * as scope aliases `{name → that local's path}` (`BlokLocalsScope`); a bound
 * control writes through the alias.
 */

/** The data-model root every local's value lives under. */
export const LOCALS_ROOT = '$locals';

/** One path segment for a runtime id: `/` and `.` would split it. */
const encodeSegment = (runtimeId: string): string => encodeURIComponent(runtimeId).replace(/\./g, '%2E');

/** The data-model path of the value of the local whose runtime id is `runtimeId`. */
export const localValuePath = (runtimeId: string): string => `${LOCALS_ROOT}/${encodeSegment(runtimeId)}`;

/** The runtime id of the local whose value `path` is (or is below), or null when it is no local's. */
export const runtimeIdOfPath = (path: string): string | null => {
  const [root, segment] = splitPathSegments(path);
  if (root !== LOCALS_ROOT || segment === undefined) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
};

/** The `<local>` node a runtime path value belongs to, or null when it is no local's. */
export const localNodeOfPath = (path: string): string | null => {
  const runtimeId = runtimeIdOfPath(path);
  return runtimeId === null ? null : nodeOfRuntimeId(runtimeId);
};

const NO_KEYS: readonly string[] = Object.freeze([]);
const BlokItemKeysContext = React.createContext<readonly string[]>(NO_KEYS);

/** The item keys of the foreach items this subtree is inside, outermost first (`7`, `#2`). */
export const useBlokItemKeys = (): readonly string[] => React.useContext(BlokItemKeysContext);

/** A subtree inside one more foreach item: `key` is the item's (`foreachItemIds` without the foreach's id and `@`). */
export const BlokItemKeyProvider = ({itemKey, children}: {itemKey: string; children: React.ReactNode}) => {
  const outer = React.useContext(BlokItemKeysContext);
  const keys = React.useMemo(() => [...outer, itemKey], [outer, itemKey]);
  return <BlokItemKeysContext.Provider value={keys}>{children}</BlokItemKeysContext.Provider>;
};

/** Passes the item keys through a boundary that drops React context (a scene's portal). */
export const BlokItemKeysBridge = ({keys, children}: {keys: readonly string[]; children: React.ReactNode}) => (
  <BlokItemKeysContext.Provider value={keys}>{children}</BlokItemKeysContext.Provider>
);

/** A `<local>` child as the renderer provides it: its node, the name it is read by, and its default. */
export type BlokLocalDeclaration = {node: string; name: string; default: unknown};

/** The `<local>` children of `node`, each with its name and default (a literal); one without a name is skipped. */
export const localChildren = (node: BlokComponentNode): BlokLocalDeclaration[] =>
  (node.children ?? []).flatMap(child => {
    if (child.component !== 'local') return [];
    const name = child.props?.find(prop => prop.key === 'name');
    const declared = name?.declares_value ?? (typeof name?.static_value === 'string' ? name.static_value : null);
    if (!declared) return [];
    const fallback = child.props?.find(prop => prop.key === 'default')?.static_value;
    return [{node: child.id, name: declared, default: fallback ?? null}];
  });

/**
 * Provides a node's locals to its children: each name aliased to the path of
 * its value here (in this foreach item), reading its default until written.
 */
export const BlokLocalsScope = ({locals, children}: {locals: readonly BlokLocalDeclaration[]; children: React.ReactNode}) => {
  const keys = useBlokItemKeys();
  const {aliases, defaults} = React.useMemo(() => {
    const aliases: Record<string, string> = {};
    const defaults: Record<string, unknown> = {};
    for (const local of locals) {
      const path = localValuePath(runtimeIdOf(local.node, keys));
      aliases[local.name] = path;
      defaults[path] = local.default;
    }
    return {aliases, defaults};
  }, [keys, locals]);
  return (
    <BlokScopeProvider aliases={aliases} defaults={defaults}>
      {children}
    </BlokScopeProvider>
  );
};
