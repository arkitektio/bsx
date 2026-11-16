import {declaredQueries as queriesOfTree, declaredSubscriptions as subscriptionsOfTree} from '../bsx/declared';
import {resolveLocals} from '../bsx/infer';
import {viewForTree} from '../bsx/references';
import type {BlokLocal, BlokLocalChoice, BlokLocalPort} from './persist';
import {
  idleTaskRecord,
  normalizeBlokArgument,
  pendingReads,
  type BlokActionArgument,
  type BlokComponentNode,
  type BlokQuery,
  type BlokQueryRecord,
  type BlokSourceStatus,
  type BlokSubscription,
  type BlokSubscriptionRecord,
  type BlokTaskRecord,
} from './runtime';

/**
 * What a host gets of a v2 blok beside its tree (`Blok`/`BlokRevision`:
 * `vocab`, `resolvedLocals`, `demo`), what its tree declares (its `<query>`
 * and `<subscription>` children), and the data model a renderer starts from.
 *
 * The roots a blok reads (vocabulary `roots.data`) are laid out as:
 *
 *     {
 *       deps: {<key>: {<state>: ..., tasks: {<action>: TaskRecord}, assets: {...}, id, name}},
 *       args: {...}, task: TaskRecord, viewer: {...}, then: null | "...",
 *       queries: {<name>: {status, value, error, refetching, fetching_more}},
 *       subscriptions: {<name>: {status, value, error}},
 *       <into name>: TaskRecord,
 *       $locals: {<local's runtime id, encoded>: value},
 *     }
 *
 * `self` reads `deps.self`; a `<local>` is read by its name through its
 * parent's scope (`runtime/locals`).
 */

/**
 * A local as its tree resolves it (`resolvedLocals`): an arg port (`ArgPort`
 * fields) plus `persist`, its kind always said (inferred where the blok left
 * it out, ANY when nothing tells), and `node`, the id of the `<local>` that
 * declares it. A renderer types a local's values (a kept one too) by its node.
 */
export type BlokDeclaredLocal = {
  /** The id of the `<local>` node that declares it. */
  node: string;
  key: string;
  kind: string;
  identifier?: string | null;
  nullable?: boolean | null;
  default?: unknown;
  children?: readonly BlokDeclaredLocalPort[] | null;
  choices?: readonly BlokLocalChoice[] | null;
  label?: string | null;
  description?: string | null;
  persist?: boolean | null;
};

/** A child port of a local (a list's item, a dict's or model's fields). */
export type BlokDeclaredLocalPort = Omit<BlokDeclaredLocal, 'persist' | 'node'>;

export type BlokDeclaredRead = {
  key: string;
  service: string;
  document: string;
  /** Stored call arguments, as the wire carries them (camelCase or snake_case). */
  variables?: unknown;
  poll?: number | null;
  /** A query's list field that `fetch_more` appends to (a dotted path). */
  more?: string | null;
  keep?: number | null;
  history?: string | null;
};

/**
 * What a host gets of a blok beside its tree (`Blok`/`BlokRevision`: `vocab`,
 * `resolvedLocals`, `demo`). Its locals, queries and subscriptions are nodes
 * of the tree; `resolvedLocals` is how the server typed the locals.
 */
export type BlokDeclarations = {
  vocab?: number | null;
  /** The `<local>` nodes as the tree resolves them, each with its `node`: what the renderer types them with. */
  resolvedLocals: readonly BlokDeclaredLocal[];
  demo?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const variablesOf = (raw: unknown): BlokActionArgument[] =>
  (Array.isArray(raw) ? raw : []).map(argument => normalizeBlokArgument(argument) as BlokActionArgument);

const localPort = (port: BlokDeclaredLocalPort): BlokLocalPort => ({
  key: port.key,
  kind: port.kind,
  identifier: port.identifier ?? null,
  nullable: port.nullable ?? false,
  default: port.default ?? null,
  children: port.children ? port.children.map(localPort) : null,
  choices: port.choices ?? null,
  label: port.label ?? null,
  description: port.description ?? null,
});

export const declaredLocals = (declarations: BlokDeclarations): BlokLocal[] =>
  declarations.resolvedLocals.map(local => ({...localPort(local), node: local.node, persist: local.persist === true}));

/** The one root of a tree as the wire spells it (a list of roots, or one), or null. */
const rootOf = (roots: ReadonlyArray<unknown> | unknown): BlokComponentNode | null => {
  const list = Array.isArray(roots) ? roots : [roots];
  const [root] = list;
  return list.length === 1 && isRecord(root) && typeof root.component === 'string' ? (root as BlokComponentNode) : null;
};

/** The reads a blok declares: its `<Blok>`'s `<query>` children. */
export const treeQueries = (roots: ReadonlyArray<unknown> | unknown): BlokQuery[] =>
  queriesOfTree(rootOf(roots)).map(query => ({
    key: query.key,
    service: query.service,
    document: query.document,
    variables: variablesOf(query.variables),
    poll: query.poll ?? null,
    more: query.more ?? null,
  }));

/** The streams a blok declares: its `<Blok>`'s `<subscription>` children. */
export const treeSubscriptions = (roots: ReadonlyArray<unknown> | unknown): BlokSubscription[] =>
  subscriptionsOfTree(rootOf(roots)).map(subscription => ({
    key: subscription.key,
    service: subscription.service,
    document: subscription.document,
    variables: variablesOf(subscription.variables),
    keep: subscription.keep ?? null,
    history: subscription.history ?? null,
  }));

/** The names `into` gives a task call's record, in the tree. */
export const intoNames = (roots: ReadonlyArray<unknown>): string[] => {
  const names = new Set<string>();
  const visit = (node: unknown) => {
    if (!isRecord(node)) return;
    const typed = node as Partial<BlokComponentNode>;
    for (const prop of typed.props ?? []) {
      if (prop.agent_call && prop.declares_value) names.add(prop.declares_value);
    }
    (typed.children ?? []).forEach(visit);
  };
  roots.forEach(visit);
  return [...names];
};

/** Every `into` record before its call ran: idle. */
export const intoModel = (roots: ReadonlyArray<unknown>): Record<string, BlokTaskRecord> =>
  Object.fromEntries(intoNames(roots).map(name => [name, idleTaskRecord()]));

/**
 * What a renderer shows live before anything synced: idle `into` records and
 * pending reads. Locals read their defaults until written (`runtime/locals`).
 */
export const liveModel = (roots: ReadonlyArray<unknown>): {data: Record<string, unknown>; statuses: Record<string, BlokSourceStatus>} => {
  const reads = pendingReads(treeQueries(roots), treeSubscriptions(roots));
  return {
    data: {...intoModel(roots), ...reads.data},
    statuses: reads.statuses,
  };
};

/**
 * What a preview renders: the blok's `demo`, mirroring the roots
 * (`{deps, args, task, queries, subscriptions}`), with every read the tree
 * declares answered by its demo value. Nothing is pending in a preview.
 */
export const demoModel = (roots: ReadonlyArray<unknown>, declarations: Pick<BlokDeclarations, 'demo'>): Record<string, unknown> => {
  const demo = isRecord(declarations.demo) ? declarations.demo : {};
  const demoQueries = isRecord(demo.queries) ? demo.queries : {};
  const demoSubscriptions = isRecord(demo.subscriptions) ? demo.subscriptions : {};
  const queries = Object.fromEntries(
    treeQueries(roots).map(query => [
      query.key,
      {status: 'ready', value: demoQueries[query.key] ?? null, error: null, refetching: false, fetching_more: false} satisfies BlokQueryRecord,
    ]),
  );
  const subscriptions = Object.fromEntries(
    treeSubscriptions(roots).map(subscription => [
      subscription.key,
      {status: 'ready', value: demoSubscriptions[subscription.key] ?? null, error: null} satisfies BlokSubscriptionRecord,
    ]),
  );
  const task = isRecord(demo.task) ? {...idleTaskRecord(), ...demo.task} : undefined;
  return {
    ...intoModel(roots),
    deps: isRecord(demo.deps) ? demo.deps : {},
    args: isRecord(demo.args) ? demo.args : {},
    ...(task ? {task} : {}),
    ...(Object.keys(queries).length ? {queries} : {}),
    ...(Object.keys(subscriptions).length ? {subscriptions} : {}),
  };
};

/**
 * What a service serves of a blok as JSON (snake_case values): its tree, and
 * the locals as it resolved them (`resolved_locals`, each with its `node`),
 * when it did.
 */
export type BlokDeclarationsJson = {
  vocab?: number | null;
  componentTree?: unknown;
  resolvedLocals?: unknown;
  demo?: unknown;
};

const optionalString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const jsonChoices = (raw: unknown): BlokLocalChoice[] | null =>
  Array.isArray(raw)
    ? raw.filter(isRecord).map(choice => ({value: choice.value ?? null, label: optionalString(choice.label), description: optionalString(choice.description)}))
    : null;

/** A port from JSON; one without a key or kind is dropped. */
const jsonLocalPort = (port: Record<string, unknown>): BlokDeclaredLocalPort | null =>
  typeof port.key === 'string' && typeof port.kind === 'string'
    ? {
        key: port.key,
        kind: port.kind,
        identifier: optionalString(port.identifier),
        nullable: port.nullable === true,
        default: port.default ?? null,
        children: Array.isArray(port.children)
          ? port.children.filter(isRecord).flatMap(child => {
              const parsed = jsonLocalPort(child);
              return parsed ? [parsed] : [];
            })
          : null,
        choices: jsonChoices(port.choices),
        label: optionalString(port.label),
        description: optionalString(port.description),
      }
    : null;

/** Resolved locals from JSON; one without a node, a key or a kind is dropped. */
const jsonResolvedLocals = (raw: unknown): BlokDeclaredLocal[] =>
  (Array.isArray(raw) ? raw : []).filter(isRecord).flatMap(local => {
    const port = jsonLocalPort(local);
    return port && typeof local.node === 'string' ? [{...port, node: local.node, persist: local.persist === true}] : [];
  });

/**
 * The `<local>` nodes of a tree resolved the way the spec and the server
 * resolve them (default, task argument, bind, else ANY), checked unmounted:
 * what a host uses when the server sent no `resolvedLocals`.
 */
export const resolveTreeLocals = (roots: ReadonlyArray<unknown> | unknown): BlokDeclaredLocal[] => {
  const root = rootOf(roots);
  if (!root) return [];
  return [...resolveLocals(root, null, viewForTree(root))].map(([node, {local}]) => ({...local, node}) as BlokDeclaredLocal);
};

/** A blok's declarations from JSON a service serves: its resolved locals as served, or resolved from its tree. */
export const parseBlokDeclarations = (raw: BlokDeclarationsJson): BlokDeclarations => ({
  vocab: raw.vocab ?? null,
  resolvedLocals: raw.resolvedLocals !== undefined && raw.resolvedLocals !== null ? jsonResolvedLocals(raw.resolvedLocals) : resolveTreeLocals(raw.componentTree),
  demo: raw.demo ?? null,
});
