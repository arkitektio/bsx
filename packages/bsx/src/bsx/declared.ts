import type {BlokActionArgument, BlokComponentNode, BlokComponentProp} from '../renderer/runtime/types';
import {finding, loadVocabulary, type BlokContextName, type BlokFinding, type BlokKind} from '../spec/vocabulary';
import {portIsValid} from './infer';

/**
 * What a blok says of itself in its tree: its `<Blok>` header and its
 * declarations. The port of arkitekt-spec's `blok/declared.py`.
 *
 * Every blok is one `<Blok kind=... context=...>` element (vocabulary `blok`):
 *
 * - the header (`blokHeader`): its kind, its context, the catalog it is
 *   written for and the host's chrome, all literals on the root;
 * - its declarations, each a node of its own that draws nothing: `<local>`
 *   anywhere (first among its parent's children, in scope in its parent's
 *   subtree), `<query>` and `<subscription>` as children of the `<Blok>`, each
 *   with `<var>` children for its variables, and an agent blok's
 *   `<dependencies>` children of the `<Blok>`.
 *
 * Nothing here checks a rule beyond what makes a declaration readable at all;
 * the checker (`references.ts`) says the rest.
 */

export const BLOK_COMPONENT = 'Blok';
export const LOCAL_COMPONENT = 'local';
export const QUERY_COMPONENT = 'query';
export const SUBSCRIPTION_COMPONENT = 'subscription';
export const VAR_COMPONENT = 'var';
export const DEPENDENCIES_COMPONENT = 'dependencies';
/** The components that declare what a blok owns and draw nothing. */
export const DECLARATION_COMPONENTS: ReadonlySet<string> = new Set([
  LOCAL_COMPONENT,
  QUERY_COMPONENT,
  SUBSCRIPTION_COMPONENT,
  VAR_COMPONENT,
  DEPENDENCIES_COMPONENT,
]);
/** The name a local, a query or a subscription is read by. */
export const NAME_PROP = 'name';
/** A local's borrowed port: `self.<action>.<arg>` or `deps.<key>.<action>.<arg>`. */
export const LIKE_PROP = 'like';
const KEY_PROP = 'key';
const VALUE_PROP = 'value';
export const KIND_ATTRIBUTE = 'kind';
export const CONTEXT_ATTRIBUTE = 'context';
export const CATALOG_ATTRIBUTE = 'catalog';
export const CHROME_ATTRIBUTE = 'chrome';

/** What a `<local>` may say beside its name and `like`: a port's fields and `persist` (`BlokLocalInput` but its key). */
export const LOCAL_FIELDS: readonly string[] = [
  'children',
  'choices',
  'default',
  'description',
  'dimension',
  'effects',
  'identifier',
  'kind',
  'label',
  'nullable',
  'persist',
  'proposed_units',
  'reference_unit',
  'requires',
  'validators',
  'widget',
];

const PORT_KINDS: ReadonlySet<string> = new Set([
  'INT',
  'STRING',
  'STRUCTURE',
  'LIST',
  'BOOL',
  'DICT',
  'FLOAT',
  'DATE',
  'UNION',
  'ENUM',
  'MODEL',
  'MEMORY_STRUCTURE',
  'INTERFACE',
  'QUANTITY',
]);
const LOCAL_ANY = 'ANY';

/** What a `<Blok>` says of itself. */
export type BlokHeader = {
  kind: BlokKind;
  /** `PANEL`, `SCENE` or `LOGO`. */
  context: BlokContextName;
  catalog: string | null;
  chrome: string | null;
  /** The root's id. */
  node: string;
};

const staticProp = (node: BlokComponentNode, key: string): BlokComponentProp | undefined => node.props?.find(prop => prop.key === key);

const isLiteral = (prop: BlokComponentProp): boolean => prop.dynamic_value == null && prop.util_call == null && prop.agent_call == null;

const literalText = (node: BlokComponentNode, key: string): string | null => {
  const prop = staticProp(node, key);
  return prop !== undefined && isLiteral(prop) && typeof prop.static_value === 'string' ? prop.static_value : null;
};

/** Why `tree` is no readable `<Blok>`, or null: `blok.root` or `blok.attribute`. */
export const headerProblem = (tree: BlokComponentNode): BlokFinding | null => {
  const vocabulary = loadVocabulary();
  if (tree.component !== vocabulary.blok.component) return finding('blok.root', {component: tree.component}, {nodeId: tree.id});
  const kinds = Object.keys(vocabulary.kinds).join('|');
  const problem = (text: string) => finding('blok.attribute', {problem: text, kinds}, {nodeId: tree.id});
  for (const key of [KIND_ATTRIBUTE, CONTEXT_ATTRIBUTE]) {
    const prop = staticProp(tree, key);
    if (prop === undefined) return problem(`needs ${key}="..."`);
    if (!isLiteral(prop) || typeof prop.static_value !== 'string') return problem(`takes ${key} as a literal string`);
  }
  const kind = literalText(tree, KIND_ATTRIBUTE) ?? '';
  if (!(kind in vocabulary.kinds)) return problem(`has no kind '${kind}'`);
  const context = literalText(tree, CONTEXT_ATTRIBUTE) ?? '';
  if (!(context in vocabulary.blok.contexts)) {
    return problem(`has no context '${context}' (${Object.keys(vocabulary.blok.contexts).join(', ')})`);
  }
  for (const key of [CATALOG_ATTRIBUTE, CHROME_ATTRIBUTE]) {
    const prop = staticProp(tree, key);
    if (prop !== undefined && (!isLiteral(prop) || typeof prop.static_value !== 'string')) return problem(`takes ${key} as a literal string`);
  }
  return null;
};

/** The header of a blok, or null when its root is no readable `<Blok>` (`headerProblem` says why). */
export const blokHeader = (tree: BlokComponentNode): BlokHeader | null => {
  if (headerProblem(tree) !== null) return null;
  const vocabulary = loadVocabulary();
  return {
    kind: literalText(tree, KIND_ATTRIBUTE) as BlokKind,
    context: vocabulary.blok.contexts[literalText(tree, CONTEXT_ATTRIBUTE) ?? ''],
    catalog: literalText(tree, CATALOG_ATTRIBUTE),
    chrome: literalText(tree, CHROME_ATTRIBUTE),
    node: tree.id,
  };
};

/** The catalog a blok's `<Blok>` names; null for the base catalog (and for no `<Blok>`). */
export const blokCatalog = (tree: BlokComponentNode): string | null =>
  tree.component === BLOK_COMPONENT ? literalText(tree, CATALOG_ATTRIBUTE) : null;

/** Whether `node` declares something (a local, a query, ...) rather than drawing. */
export const isDeclaration = (node: {component: string}): boolean => DECLARATION_COMPONENTS.has(node.component);

/** The children of `node` that draw: its declarations left out. */
export const content = (node: BlokComponentNode): BlokComponentNode[] => (node.children ?? []).filter(child => !isDeclaration(child));

/** The name a `<local>` declares, or null when it has none. */
export const localName = (node: BlokComponentNode): string | null => {
  const value = staticProp(node, NAME_PROP)?.static_value;
  return typeof value === 'string' ? value : null;
};

/** The argument a `<local>` borrows its port from (`self.move.to`), or null. */
export const localLike = (node: BlokComponentNode): string | null => {
  const value = staticProp(node, LIKE_PROP)?.static_value;
  return typeof value === 'string' ? value : null;
};

/** A local as written in its `<local>` node: a port (`BlokLocalInput`), its kind left out unless it gives one. */
export type DeclaredLocal = {
  key: string;
  kind?: string | null;
  persist?: boolean | null;
  [field: string]: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Why the fields of a local make no valid port, or null. */
const localFieldsProblem = (fields: Record<string, unknown>): string | null => {
  const kind = fields.kind;
  if (kind !== undefined && (typeof kind !== 'string' || (kind !== LOCAL_ANY && !PORT_KINDS.has(kind)))) return `kind: '${String(kind)}' is no port kind`;
  for (const key of ['label', 'description', 'identifier', 'reference_unit', 'dimension']) {
    if (fields[key] !== undefined && typeof fields[key] !== 'string') return `${key}: a string`;
  }
  for (const key of ['nullable', 'persist']) {
    if (fields[key] !== undefined && typeof fields[key] !== 'boolean') return `${key}: a bool`;
  }
  for (const key of ['children', 'choices', 'effects', 'validators', 'requires', 'proposed_units']) {
    if (fields[key] !== undefined && !Array.isArray(fields[key])) return `${key}: a list`;
  }
  if (fields.widget !== undefined && !isRecord(fields.widget)) return 'widget: an object';
  if (fields.kind !== undefined && fields.kind !== LOCAL_ANY && !portIsValid(fields as Parameters<typeof portIsValid>[0])) return 'its port is incomplete for its kind';
  return null;
};

const localFields = (node: BlokComponentNode, name: string): Record<string, unknown> => {
  const fields: Record<string, unknown> = {key: name};
  for (const prop of node.props ?? []) {
    if (prop.key === NAME_PROP || prop.key === LIKE_PROP || !LOCAL_FIELDS.includes(prop.key)) continue;
    if (prop.static_value !== undefined && prop.static_value !== null) fields[prop.key] = prop.static_value;
  }
  return fields;
};

/** Why a `<local>` declares nothing readable, or null: `local.attribute`. */
export const localProblem = (node: BlokComponentNode): BlokFinding | null => {
  const declared = localName(node);
  const name = declared ?? '?';
  const problem = (key: string, text: string) => finding('local.attribute', {name, key, problem: text}, {nodeId: node.id});
  if (declared === null) return problem('name', 'is missing: write name="x"');
  for (const prop of node.props ?? []) {
    if (prop.key === NAME_PROP || prop.key === LIKE_PROP) continue;
    if (!LOCAL_FIELDS.includes(prop.key)) return problem(prop.key, `is no field of a local (${[...LOCAL_FIELDS].sort().join(', ')}, like)`);
    if (!isLiteral(prop)) return problem(prop.key, 'is not a literal');
  }
  if (node.children?.length) return problem('children', 'are not elements: a local holds nothing');
  const wrong = localFieldsProblem(localFields(node, declared));
  if (wrong !== null) return problem('its port', `is no valid port (${wrong})`);
  return null;
};

/** A readable `<local>` as the port it declares (`localProblem` null), its kind left out unless it gives one. */
export const declaredLocal = (node: BlokComponentNode): DeclaredLocal | null => {
  const name = localName(node);
  if (name === null || localProblem(node) !== null) return null;
  return localFields(node, name) as DeclaredLocal;
};

/** Every node of `tree` with its ancestors, depth first. */
export const iterWithParents = (tree: BlokComponentNode): Array<[BlokComponentNode, readonly BlokComponentNode[]]> => {
  const found: Array<[BlokComponentNode, readonly BlokComponentNode[]]> = [];
  const visit = (node: BlokComponentNode, ancestors: readonly BlokComponentNode[]) => {
    found.push([node, ancestors]);
    for (const child of node.children ?? []) visit(child, [...ancestors, node]);
  };
  visit(tree, []);
  return found;
};

/** Every readable `<local>` of `tree`, by its node id, in tree order. */
export const declaredLocals = (tree: BlokComponentNode): Map<string, DeclaredLocal> => {
  const found = new Map<string, DeclaredLocal>();
  for (const [node] of iterWithParents(tree)) {
    if (node.component !== LOCAL_COMPONENT) continue;
    const local = declaredLocal(node);
    if (local !== null) found.set(node.id, local);
  }
  return found;
};

/** A `<var key value>` as the argument it is stored as, or null when it is none. */
export const varArgument = (node: BlokComponentNode): BlokActionArgument | null => {
  const key = staticProp(node, KEY_PROP);
  if (key === undefined || typeof key.static_value !== 'string') return null;
  const value = staticProp(node, VALUE_PROP);
  if (value === undefined || (value.static_value == null && value.dynamic_value == null && value.util_call == null && value.agent_call == null)) {
    return {key: key.static_value};
  }
  if (value.agent_call != null) return null;
  if (value.dynamic_value?.path != null) return {key: key.static_value, value_path: value.dynamic_value.path};
  if (value.util_call != null) return {key: key.static_value, util_call: value.util_call};
  return {key: key.static_value, value_literal: value.static_value};
};

/** A declared read as the wire's `BlokQueryInput` spells it. */
export type DeclaredQuery = {
  key: string;
  service: string;
  document: string;
  variables: BlokActionArgument[];
  poll?: number | null;
  more?: string | null;
};

/** A declared stream as the wire's `BlokSubscriptionInput` spells it. */
export type DeclaredSubscription = {
  key: string;
  service: string;
  document: string;
  variables: BlokActionArgument[];
  keep?: number | null;
  history?: string | null;
};

const READ_FIELDS: Readonly<Record<string, readonly string[]>> = {
  [QUERY_COMPONENT]: ['poll', 'more'],
  [SUBSCRIPTION_COMPONENT]: ['keep', 'history'],
};
const REQUIRED_READ_PROPS = [NAME_PROP, 'service', 'document'];

const readFieldProblem = (component: string, key: string, value: unknown): string | null => {
  if (!(READ_FIELDS[component] ?? []).includes(key)) return `${key}: Extra inputs are not permitted`;
  if (key === 'poll' && !(typeof value === 'number' && value > 0)) return 'poll: Input should be a number greater than 0';
  if (key === 'keep' && !(typeof value === 'number' && Number.isInteger(value) && value >= 1)) return 'keep: Input should be an integer of at least 1';
  if ((key === 'more' || key === 'history') && typeof value !== 'string') return `${key}: Input should be a valid string`;
  return null;
};

/** Why a `<query>` or `<subscription>` declares nothing readable, or null: `query.declaration`. */
export const declarationProblem = (node: BlokComponentNode): BlokFinding | null => {
  const problem = (text: string, at: string = node.id) => finding('query.declaration', {component: node.component, problem: text}, {nodeId: at});
  for (const key of REQUIRED_READ_PROPS) {
    const prop = staticProp(node, key);
    if (prop === undefined || !isLiteral(prop) || typeof prop.static_value !== 'string' || !prop.static_value) {
      return problem(`needs ${key}="..." as a literal string`);
    }
  }
  for (const prop of node.props ?? []) {
    if (!REQUIRED_READ_PROPS.includes(prop.key) && !isLiteral(prop)) return problem(`takes ${prop.key} as a literal`);
  }
  for (const child of node.children ?? []) {
    if (child.component !== VAR_COMPONENT) return problem(`holds only <var> children, not <${child.component}>`, child.id);
    if (varArgument(child) === null) return problem('has a <var> without key="..." or with a task call as its value', child.id);
  }
  for (const prop of node.props ?? []) {
    if (REQUIRED_READ_PROPS.includes(prop.key) || prop.static_value === undefined || prop.static_value === null) continue;
    const wrong = readFieldProblem(node.component, prop.key, prop.static_value);
    if (wrong !== null) return problem(wrong);
  }
  return null;
};

const declaredRead = (node: BlokComponentNode): Record<string, unknown> => {
  const fields: Record<string, unknown> = {};
  for (const prop of node.props ?? []) {
    if (prop.static_value !== undefined && prop.static_value !== null) fields[prop.key === NAME_PROP ? 'key' : prop.key] = prop.static_value;
  }
  fields.variables = (node.children ?? []).flatMap(child => {
    const argument = varArgument(child);
    return argument ? [argument] : [];
  });
  return fields;
};

const rootChildren = (tree: BlokComponentNode | null | undefined): BlokComponentNode[] => tree?.children ?? [];

/**
 * A `<dependencies key="cells" like="self.<action>" />` (custom blok: `agents.<name>.<action>`):
 * the dependencies of one action, each read and called as `deps.<key>__<dependency>` and
 * handed to a run of that action with `with <key>`.
 */
export type DeclaredDependencies = {
  key: string;
  node: string;
  /** As written; null when it is missing or no literal. */
  like: string | null;
};

/**
 * Whose action it names: `['self', action]` for `self.<action>`, `[key, action]` for a custom
 * blok's `agents.<key>.<action>` (stored `deps.<key>.<action>`); else null.
 */
export const dependenciesTarget = (declared: DeclaredDependencies): readonly [string, string] | null => {
  const parts = declared.like ? declared.like.split('.') : [];
  if (parts.length === 2 && parts[0] === 'self' && parts[1]) return ['self', parts[1]];
  if (parts.length === 3 && parts[0] === 'deps' && parts[1] && parts[1] !== 'self' && parts[2]) return [parts[1], parts[2]];
  return null;
};

/** The dependency whose action it names: `self`, or a custom blok's bound agent. */
export const dependenciesOwner = (declared: DeclaredDependencies): string | null => dependenciesTarget(declared)?.[0] ?? null;

/** The action `like` names, else null. */
export const dependenciesAction = (declared: DeclaredDependencies): string | null => dependenciesTarget(declared)?.[1] ?? null;

/** The keyed `<dependencies>` children of a blok's `<Blok>`, in order. */
export const declaredDependencies = (tree: BlokComponentNode | null | undefined): DeclaredDependencies[] =>
  rootChildren(tree).flatMap(child => {
    if (child.component !== DEPENDENCIES_COMPONENT) return [];
    const key = staticProp(child, KEY_PROP)?.static_value;
    const like = staticProp(child, LIKE_PROP)?.static_value;
    return typeof key === 'string' && key ? [{key, node: child.id, like: typeof like === 'string' ? like : null}] : [];
  });

/** The readable `<query>` children of a blok's `<Blok>`, in order. */
export const declaredQueries = (tree: BlokComponentNode | null | undefined): DeclaredQuery[] =>
  rootChildren(tree)
    .filter(child => child.component === QUERY_COMPONENT && declarationProblem(child) === null)
    .map(child => declaredRead(child) as DeclaredQuery);

/** The readable `<subscription>` children of a blok's `<Blok>`, in order. */
export const declaredSubscriptions = (tree: BlokComponentNode | null | undefined): DeclaredSubscription[] =>
  rootChildren(tree)
    .filter(child => child.component === SUBSCRIPTION_COMPONENT && declarationProblem(child) === null)
    .map(child => declaredRead(child) as DeclaredSubscription);

/**
 * The runtime id of a node rendered inside foreach items: its node id plus one
 * `@<item key>` per enclosing foreach, outermost first (`Blok[0]/foreach[0]/local[0]@7`,
 * `...@#2` for an item keyed by its position). A node id never holds `@`.
 */
export const runtimeIdOf = (nodeId: string, itemKeys: readonly string[]): string => [nodeId, ...itemKeys].join('@');

/** The node a runtime id is of (`Blok[0]/foreach[0]/local[0]@7` → `Blok[0]/foreach[0]/local[0]`). */
export const nodeOfRuntimeId = (runtimeId: string): string => runtimeId.split('@')[0];
