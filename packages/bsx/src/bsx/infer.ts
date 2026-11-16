import type {BlokActionArgument, BlokAgentCall, BlokComponentNode, BlokComponentProp} from '../renderer/runtime/types';
import type {BlokView} from '../spec/catalogs';
import {LOCAL_ANY_KIND} from '../spec/vocabulary';
import {declaredLocal, iterWithParents, LOCAL_COMPONENT, localLike, NAME_PROP} from './declared';
import type {BlokPortMatch, BlokScopeDependency, BlokScopeLocal, BlokScopeLocalPort, ResolvedBlokLocal} from './references';

/**
 * Resolve what a blok leaves to its tree: the kinds of its `<local>`
 * declarations. The port of arkitekt-spec's `declare/blok/infer.py`
 * (`resolve_locals`); the server and takt resolve the same way on save, so a
 * source blok sent without kinds is stored the same everywhere.
 *
 * **A local's kind**, when it is left out (a given kind, `ANY` included, is
 * kept), is the first of:
 * 1. its default: a bool BOOL, an integer INT, any other number FLOAT, a
 *    string STRING, a non-empty list (object) of one scalar kind a LIST (DICT)
 *    of it, its item port keyed `...`;
 * 2. the port of the task argument it is passed to whole, at the first call
 *    in tree order whose arg match has a kind (recursively) and makes a valid local;
 * 3. the bind kind of the first control bound to it whole, when that is
 *    STRING, INT, FLOAT or BOOL;
 * 4. else ANY: an untyped value, never an error.
 *
 * A given `kind` and `like="self.<action>.<arg>"` come before all of these
 * (`like` is resolved only where the blok is mounted). Only uses in the
 * local's scope (its parent's subtree) count. Every field the local sets wins
 * over the inferred type, which only fills what it leaves out; a candidate
 * that makes no valid port is skipped.
 *
 * Nothing else is inferred: every `deps.<key>` a blok reads, whatever its
 * kind, must be declared (`deps.unknown` otherwise, its hint naming the
 * declaration to add).
 */

export const LOCAL_ANY = LOCAL_ANY_KIND;
const ITEM_KEY = '...';
const BIND_PROP = 'bind';
const FOREACH = 'foreach';
const FOREACH_LET = 'let';
const FOREACH_ITEMS = 'items';
/** The bind kinds a local takes from its control; a LIST, DICT or ANY control tells too little. */
const BIND_INFERRED: ReadonlySet<string> = new Set(['STRING', 'INT', 'FLOAT', 'BOOL']);

/** A type a rule infers: a port's kind and what goes with it, without the local's own fields. */
export type InferredType = {
  kind: string;
  identifier?: string | null;
  nullable?: boolean;
  children?: readonly InferredPort[];
};
type InferredPort = InferredType & {key: string};

/** Whether `local` says its kind (`ANY` included), rather than leaving it to the tree. */
export const kindGiven = (local: BlokScopeLocal): boolean => local.kind !== undefined && local.kind !== null;

const scalarKind = (value: unknown): string | null => {
  if (typeof value === 'boolean') return 'BOOL';
  if (typeof value === 'number') return Number.isInteger(value) ? 'INT' : 'FLOAT';
  if (typeof value === 'string') return 'STRING';
  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The type a default implies (rule 1), or null when it says nothing (null, `[]`, `{}`, mixed items). */
export const defaultType = (value: unknown): InferredType | null => {
  const scalar = scalarKind(value);
  if (scalar !== null) return {kind: scalar};
  const items: readonly unknown[] = Array.isArray(value) ? value : isRecord(value) ? Object.values(value) : [];
  const kinds = new Set(items.map(scalarKind));
  if (kinds.size !== 1 || kinds.has(null)) return null;
  const [itemKind] = [...kinds];
  if (itemKind === null) return null;
  return {kind: Array.isArray(value) ? 'LIST' : 'DICT', children: [{key: ITEM_KEY, kind: itemKind}]};
};

/** The type an arg match says (a kind, recursively for its children), or null when it says too little. */
export const matchType = (match: BlokPortMatch): InferredType | null => {
  if (match.kind == null) return null;
  const typed: InferredType = {kind: match.kind, identifier: match.identifier ?? null, nullable: match.nullable === true};
  if (match.children?.length) {
    const children: InferredPort[] = [];
    for (const child of match.children) {
      const childType = matchType(child);
      if (childType === null || child.key == null) return null;
      children.push({...childType, key: child.key});
    }
    typed.children = children;
  }
  return typed;
};

type PortShape = {
  kind?: string | null;
  identifier?: string | null;
  reference_unit?: string | null;
  children?: readonly PortShape[] | null;
  key?: string | null;
};

/**
 * Whether `port` is a valid port by the spec's `PortRules`: a STRUCTURE names
 * its identifier, a QUANTITY its reference unit, a LIST has exactly one child,
 * a DICT has children, either one keyed `...` or named ones. Recursively.
 */
export const portIsValid = (port: PortShape): boolean => {
  const {kind} = port;
  const children = port.children ?? null;
  if (kind === 'STRUCTURE' && port.identifier == null) return false;
  if (kind === 'QUANTITY' && !port.reference_unit) return false;
  if (kind === 'LIST' && (children === null || children.length !== 1)) return false;
  if (kind === 'DICT') {
    if (!children?.length) return false;
    if (children.length > 1 && children.some(child => child.key === ITEM_KEY)) return false;
  }
  return (children ?? []).every(portIsValid);
};

/** `local`'s own fields: what it sets, never its (left-out) kind. */
const ownFields = (local: BlokScopeLocal): Omit<BlokScopeLocal, 'kind'> => {
  const own: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(local)) if (key !== 'kind' && value !== undefined && value !== null) own[key] = value;
  return own as Omit<BlokScopeLocal, 'kind'>;
};

/** `local` with `typed` filling what it does not say, or null when that makes no valid port. */
export const typedLocal = (local: BlokScopeLocal, typed: InferredType): ResolvedBlokLocal | null => {
  const children: readonly BlokScopeLocalPort[] | undefined = typed.children?.map(toLocalPort);
  const resolved: ResolvedBlokLocal = {
    ...(typed.identifier != null ? {identifier: typed.identifier} : {}),
    ...(typed.nullable !== undefined ? {nullable: typed.nullable} : {}),
    ...(children ? {children} : {}),
    ...ownFields(local),
    kind: typed.kind,
  };
  return portIsValid(resolved) ? resolved : null;
};

const toLocalPort = (port: InferredPort): BlokScopeLocalPort => ({
  key: port.key,
  kind: port.kind,
  ...(port.identifier != null ? {identifier: port.identifier} : {}),
  ...(port.nullable !== undefined ? {nullable: port.nullable} : {}),
  ...(port.children ? {children: port.children.map(toLocalPort)} : {}),
});

/** `local` resolved to ANY. */
export const anyLocal = (local: BlokScopeLocal): ResolvedBlokLocal => ({...ownFields(local), kind: LOCAL_ANY});

/** `local` with its kind resolved by the rules above (a given kind is kept). */
export const resolveLocal = (
  local: BlokScopeLocal,
  args: readonly InferredType[],
  binds: readonly string[],
  borrowed: InferredType | null = null,
): ResolvedBlokLocal => {
  if (kindGiven(local)) return {...local, kind: local.kind ?? LOCAL_ANY};
  const candidates: InferredType[] = [];
  if (borrowed !== null) candidates.push(borrowed);
  const fromDefault = defaultType(local.default);
  if (fromDefault !== null) candidates.push(fromDefault);
  candidates.push(...args);
  for (const kind of binds) if (BIND_INFERRED.has(kind)) candidates.push({kind});
  for (const candidate of candidates) {
    const resolved = typedLocal(local, candidate);
    if (resolved !== null) return resolved;
  }
  return anyLocal(local);
};

/* -------------------------------------------------------------------------- */
/* Where a tree uses its locals whole, and which deps it reads (at runtime)   */
/* -------------------------------------------------------------------------- */

const actionKeyFor = (call: BlokAgentCall): string => call.operation.split('.').pop() ?? call.operation;

/** What a name in scope is bound to here: a `<local>`'s node id, or null for a `let` or an `into` name. */
type UseScope = ReadonlyMap<string, string | null>;

/** The local a `<local>` node declares by name: its `name` prop's `declares_value`. */
export const localDeclared = (node: BlokComponentNode): string | null => {
  if (node.component !== LOCAL_COMPONENT) return null;
  return node.props?.find(prop => prop.key === NAME_PROP && prop.declares_value)?.declares_value ?? null;
};

/**
 * The type of an action's argument as the mount knows it: the arg match of a
 * dependency's demand (`self` included); null when it does not tell.
 */
export const argumentType = (
  dependency: string,
  action: string,
  argument: string,
  dependencies: ReadonlyMap<string, BlokScopeDependency>,
): InferredType | null => {
  const demand = dependencies.get(dependency)?.action_dependencies?.find(each => each.key === action)?.demand;
  const match = demand?.arg_matches?.find(each => each.key === argument);
  return match ? matchType(match) : null;
};

/**
 * What `like="self.<action>.<arg>"` / `"deps.<key>.<action>.<arg>"` borrows:
 * the argument's type, or why it borrows nothing.
 */
export const borrowedType = (
  like: string,
  dependencies: ReadonlyMap<string, BlokScopeDependency>,
): {typed: InferredType | null; problem: string | null} => {
  const parts = like.split('.');
  let dependency: string;
  let action: string;
  let argument: string;
  if (parts[0] === 'self' && parts.length === 3) [dependency, action, argument] = ['self', parts[1], parts[2]];
  else if (parts[0] === 'deps' && parts.length === 4) [dependency, action, argument] = [parts[1], parts[2], parts[3]];
  else return {typed: null, problem: 'is no argument: write self.<action>.<arg> or deps.<key>.<action>.<arg>'};
  const declared = dependencies.get(dependency);
  if (!declared && dependency !== 'self') {
    return {typed: null, problem: `names the dependency '${dependency}', which the mount does not have (${[...dependencies.keys()].sort().join(', ') || 'none'})`};
  }
  const actions = (declared?.action_dependencies ?? []).map(each => each.key);
  if (!actions.includes(action)) {
    return {typed: null, problem: `names the action '${action}', which ${dependency} does not have (${[...new Set(actions)].sort().join(', ') || 'none'})`};
  }
  const typed = argumentType(dependency, action, argument, dependencies);
  if (typed === null) return {typed: null, problem: `names the argument '${argument}', which ${dependency}.${action} does not have, or does not type`};
  return {typed, problem: null};
};

class Uses {
  /** Per local node id, the types of the task arguments it is passed to whole. */
  readonly args = new Map<string, InferredType[]>();
  /** Per local node id, the bind kinds of the controls bound to it whole. */
  readonly binds = new Map<string, string[]>();
  readonly deps = new Set<string>();

  private readonly dependencies: ReadonlyMap<string, BlokScopeDependency>;
  private readonly view: BlokView | null;

  constructor(dependencies: ReadonlyMap<string, BlokScopeDependency>, view: BlokView | null) {
    this.dependencies = dependencies;
    this.view = view;
  }

  read(path: string): void {
    const parts = path.split('.');
    if (parts[0] === 'deps' && parts.length > 1) this.deps.add(parts[1]);
  }

  walk(tree: BlokComponentNode): void {
    const scope = new Map<string, string | null>();
    const intoNames = (node: BlokComponentNode): void => {
      for (const prop of node.props ?? []) if (prop.agent_call && prop.declares_value) scope.set(prop.declares_value, null);
      node.children?.forEach(intoNames);
    };
    intoNames(tree);
    this.node(tree, scope);
  }

  private node(node: BlokComponentNode, scope: UseScope): void {
    this.component(node, scope);
    const declared =
      node.component === FOREACH ? node.props?.find(prop => prop.key === FOREACH_LET && prop.declares_value)?.declares_value ?? null : null;
    const inner = new Map(scope);
    if (declared !== null) inner.set(declared, null);
    for (const prop of node.props ?? []) this.prop(prop, declared !== null && prop.key === FOREACH_ITEMS ? scope : inner);
    // Every local of a node is in scope in all of its children.
    for (const child of node.children ?? []) {
      const name = localDeclared(child);
      if (name !== null) inner.set(name, child.id);
    }
    for (const child of node.children ?? []) this.node(child, inner);
  }

  private component(node: BlokComponentNode, scope: UseScope): void {
    const bind = this.view?.components.get(node.component)?.props.find(prop => prop.key === BIND_PROP);
    if (!bind) return;
    for (const prop of node.props ?? []) {
      const path = prop.key === BIND_PROP ? prop.dynamic_value?.path ?? null : null;
      const local = path !== null ? scope.get(path) ?? null : null;
      if (local !== null) {
        const binds = this.binds.get(local) ?? [];
        binds.push(bind.kind);
        this.binds.set(local, binds);
      }
    }
  }

  private prop(prop: BlokComponentProp, scope: UseScope): void {
    const path = prop.dynamic_value?.path;
    if (path != null) this.path(path, scope);
    if (prop.agent_call) this.agentCall(prop.agent_call, scope);
    if (prop.util_call) prop.util_call.arguments?.forEach(argument => this.argument(argument, scope));
  }

  private path(path: string, scope: UseScope): void {
    if (!scope.has(path.split('.')[0])) this.read(path);
  }

  private argument(argument: BlokActionArgument, scope: UseScope): void {
    if (argument.value_path != null) this.path(argument.value_path, scope);
    if (argument.agent_call) this.agentCall(argument.agent_call, scope);
    if (argument.util_call) argument.util_call.arguments?.forEach(nested => this.argument(nested, scope));
    [...(argument.value_list ?? []), ...(argument.value_dict ?? [])].forEach(nested => this.argument(nested, scope));
  }

  private agentCall(call: BlokAgentCall, scope: UseScope): void {
    if (call.dependency !== 'self') this.deps.add(call.dependency);
    const action = actionKeyFor(call);
    for (const argument of call.arguments ?? []) {
      const path = argument.value_path;
      const local = path != null ? scope.get(path) ?? null : null;
      if (local !== null && argument.key != null) {
        const typed = argumentType(call.dependency, action, argument.key, this.dependencies);
        if (typed !== null) {
          const found = this.args.get(local) ?? [];
          found.push(typed);
          this.args.set(local, found);
        }
      }
      this.argument(argument, scope);
    }
  }
}

/**
 * Every dependency key a tree reads or calls (its queries' variables, `<var>`
 * nodes, included), `self` aside, sorted: what a host checks against the
 * agents it bound (one it did not bind reads as failed, `deps.unbound`).
 */
export const dependencyKeysRead = (roots: readonly BlokComponentNode[]): string[] => {
  const uses = new Uses(new Map(), null);
  roots.forEach(root => uses.walk(root));
  return [...uses.deps].filter(key => key !== 'self').sort();
};

/** A `<local>` with its kind resolved, and why its `like` borrows nothing (null when it borrows, has none, or the blok is not mounted). */
export type ResolvedLocal = {local: ResolvedBlokLocal; likeProblem: string | null};

/**
 * Every readable `<local>` of `tree` with its kind resolved (see the module),
 * by node id, in tree order. `dependencies` null is a blok not mounted: a
 * `like` then borrows nothing, and says nothing of it either.
 */
export const resolveLocals = (
  tree: BlokComponentNode,
  dependencies: readonly BlokScopeDependency[] | null,
  view: BlokView | null,
): Map<string, ResolvedLocal> => {
  const byKey = new Map((dependencies ?? []).map(dependency => [dependency.key, dependency]));
  const uses = new Uses(byKey, view);
  uses.walk(tree);
  const resolved = new Map<string, ResolvedLocal>();
  for (const [node] of iterWithParents(tree)) {
    if (node.component !== LOCAL_COMPONENT) continue;
    const local = declaredLocal(node);
    if (local === null) continue;
    const like = localLike(node);
    const borrowed = like !== null && dependencies !== null ? borrowedType(like, byKey) : {typed: null, problem: null};
    resolved.set(node.id, {
      local: resolveLocal(local as BlokScopeLocal, uses.args.get(node.id) ?? [], uses.binds.get(node.id) ?? [], borrowed.typed),
      likeProblem: borrowed.problem,
    });
  }
  return resolved;
};
