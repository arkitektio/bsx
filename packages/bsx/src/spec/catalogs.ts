import baseCatalogJson from './catalogs/base@4.json';
import orkestratorCatalogJson from './catalogs/orkestrator@1.json';
import {parsePort, type SpecPort} from './ports';
import {loadVocabulary, type BlokContextName, type VocabFunction} from './vocabulary';

/**
 * The catalogs a blok is drawn with, in the spec's terms: the port of
 * arkitekt-spec's `blok/catalogs`.
 *
 * A *catalog* is a versioned set of components, named by the address it is
 * published at (its `id`).
 *
 * - The **base catalog** (`catalogs/base@4.json`,
 *   `https://arkitekt.live/catalogs/base/v4`): everything every renderer draws.
 *   The language's own elements, the html components, the structure and run
 *   parts a host supplies, the scene and the logo shapes. The spec owns it; this
 *   package's contracts (`catalogs/`) are held to it by a test.
 * - An **app catalog** extends another (in the end the base) with what one
 *   frontend draws beyond it. A snapshot of the Orkestrator's ships
 *   (`catalogs/orkestrator@1.json`); any other is registered by the app that
 *   draws it (`registerBlokCatalog`).
 *
 * A blok names the one catalog it is written for; the base when it names none.
 * A catalog only ever adds to what it extends.
 */

export const BASE_NAME = 'base';
/** The family of the language's own elements (control flow, async boundaries, the Blok element, the declarations, text). */
export const LANGUAGE_GROUP = 'language';
/** The Orkestrator's catalog: what it draws beyond the base. */
export const ORKESTRATOR_CATALOG_ID = 'https://arkitekt.live/catalogs/orkestrator/v1';

export type SpecProp = {
  key: string;
  /** What it takes (`spec/ports.ts`): a CALLBACK's children are its payload, a BINDING's one child what it writes; open (kind null) for the language's own. */
  port: SpecPort;
  required: boolean;
  description: string | null;
  /** The minor of its catalog that added the prop; 0: there from the start. */
  since: number;
};

export type SpecComponent = {
  name: string;
  description: string | null;
  context: BlokContextName;
  childrenContext: BlokContextName | null;
  inheritsContext: boolean;
  acceptsChildren: boolean;
  downstreamOf: readonly string[];
  notDownstreamOf: readonly string[];
  /** The prop its text children fill when it draws them (`<Button>Grip</Button>` is its `label`); null: it has none. */
  textProp: string | null;
  props: readonly SpecProp[];
  /** The blok kinds it may be placed in (`assign`); empty: any kind. */
  kinds: readonly string[];
  /** The service it needs where it is drawn (`mikro`); null: none beyond the host's own. */
  service: string | null;
  /** The minor of its catalog that added it; 0: there from the start. */
  since: number;
  /** The family it is listed under (`language`, `ui`, `html`, `run`, `scene`, `logo`). */
  group: string | null;
  /** How it is drawn where there is no pointer, when that differs. */
  touch: string | null;
  /** The catalog it is from, `name@version` (`base@4`), or the bare name of one nothing published. */
  catalog: string;
};

export type SpecCatalog = {
  name: string;
  version: number | null;
  description: string | null;
  components: readonly SpecComponent[];
  /** What a blok names it by: the address it is published at. Null for a catalog nothing targets. */
  id: string | null;
  /** How far it has grown within its version. */
  minor: number;
  /** The id of the catalog it adds to; null for the base catalog, and for one that adds to the base without saying so. */
  extends: string | null;
};

type Raw = Record<string, unknown>;

const isRaw = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);
const rawList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const texts = (value: unknown): string[] => rawList(value).filter((item): item is string => typeof item === 'string');
const count = (value: unknown): number => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0);

const contextOf = (value: unknown): BlokContextName | null =>
  value === 'PANEL' || value === 'SCENE' || value === 'LOGO' ? value : null;

/**
 * A catalog file (`{id, name, version, minor, extends, components}`) as a
 * `SpecCatalog`. Only data is read, field by field; nothing is ever executed.
 */
export const parseSpecCatalog = (raw: unknown, file: string): SpecCatalog => {
  if (!isRaw(raw) || typeof raw.name !== 'string') throw new Error(`${file} is not a catalog`);
  const vocabulary = loadVocabulary();
  const version = typeof raw.version === 'number' ? raw.version : null;
  const address = (value: unknown, what: string): string | null => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string' || !vocabulary.catalogId.test(value)) throw new Error(`${file} has an ${what} that is not the address of a catalog`);
    return value;
  };
  const catalog = version === null ? raw.name : `${raw.name}@${version}`;
  const components = rawList(raw.components).filter(isRaw).map((entry): SpecComponent => ({
    name: String(entry.name),
    description: text(entry.description),
    context: contextOf(entry.context) ?? 'PANEL',
    childrenContext: contextOf(entry.children_context),
    inheritsContext: entry.inherits_context === true,
    acceptsChildren: entry.accepts_children === true,
    downstreamOf: texts(entry.downstream_of),
    notDownstreamOf: texts(entry.not_downstream_of),
    textProp: text(entry.text_prop) || null,
    props: rawList(entry.props).filter(isRaw).map((prop): SpecProp => {
      const where = `${file}: <${String(entry.name)}> ${String(prop.key)}`;
      if ('kind' in prop && !('port' in prop)) throw new Error(`${where} is typed by a kind, not a port: a catalog written before ports; export it again`);
      return {
        key: String(prop.key),
        port: parsePort(prop.port, where),
        required: prop.required === true,
        description: text(prop.description),
        since: count(prop.since),
      };
    }),
    kinds: texts(entry.kinds),
    service: text(entry.service) || null,
    since: count(entry.since),
    group: text(entry.group) || null,
    touch: text(entry.touch) || null,
    catalog,
  }));
  return {
    name: raw.name,
    version,
    description: text(raw.description),
    components,
    id: address(raw.id, 'id'),
    minor: count(raw.minor),
    extends: address(raw.extends, 'extends'),
  };
};

export const catalogLabel = (catalog: SpecCatalog): string => (catalog.version === null ? catalog.name : `${catalog.name}@${catalog.version}`);

const BUNDLED: Readonly<Record<string, unknown>> = {
  'catalogs/base@4.json': baseCatalogJson,
  'catalogs/orkestrator@1.json': orkestratorCatalogJson,
};

let bundled: Map<string, SpecCatalog> | null = null;

const bundledCatalogs = (): Map<string, SpecCatalog> => {
  if (!bundled) {
    bundled = new Map();
    for (const [id, file] of Object.entries(loadVocabulary().bundledCatalogs)) {
      const raw = BUNDLED[file];
      if (raw === undefined) throw new Error(`${file} does not ship with this package`);
      const catalog = parseSpecCatalog(raw, file);
      if (catalog.id !== id) throw new Error(`${file} is ${catalog.id}, not ${id}`);
      bundled.set(id, catalog);
    }
  }
  return bundled;
};

/** Catalogs an app handed over (`registerBlokCatalog`), by id. */
const registered = new Map<string, SpecCatalog>();
let defaultTarget: string | SpecCatalog | null = null;
let defaultView: BlokView | null = null;

/** The base catalog: what every renderer draws. */
export const baseCatalog = (): SpecCatalog => bundledCatalogs().get(loadVocabulary().baseCatalog) as SpecCatalog;
/** The Orkestrator's catalog, as the snapshot this package ships. */
export const orkestratorCatalog = (): SpecCatalog => bundledCatalogs().get(ORKESTRATOR_CATALOG_ID) as SpecCatalog;

/**
 * The catalog called `id`: one an app registered, or one that ships; undefined
 * when unknown. What an app registers under the id of a shipped snapshot is
 * that catalog here (the app that draws it knows it best); the base catalog
 * is never replaced.
 */
export const knownCatalog = (id: string): SpecCatalog | undefined => registered.get(id) ?? bundledCatalogs().get(id);
/** Every catalog known here: those that ship (the base first; a registered one in its snapshot's place), then those registered. */
export const knownCatalogs = (): SpecCatalog[] => [
  ...[...bundledCatalogs().values()].map(catalog => (catalog.id !== null ? registered.get(catalog.id) : undefined) ?? catalog),
  ...[...registered.values()].filter(catalog => catalog.id === null || !bundledCatalogs().has(catalog.id)),
];

/** Two definitions of a component are the same when everything but where they come from is. */
export const sameComponent = (a: SpecComponent, b: SpecComponent): boolean => {
  const comparable = (component: SpecComponent): string =>
    JSON.stringify(component, (key, value: unknown) => (key === 'catalog' || key === 'group' || key === 'touch' ? undefined : value));
  return comparable(a) === comparable(b);
};

/**
 * The catalogs a blok written for `target` is drawn with, the base first.
 * `target` is a catalog's id, a catalog (one nothing published: it extends the
 * base unless it says otherwise), or null for the base alone. Throws when the
 * target or a catalog it extends is not known, or a catalog redefines a
 * component of one it extends.
 */
export const catalogChain = (target: string | SpecCatalog | null = null): SpecCatalog[] => {
  const base = baseCatalog();
  let current: SpecCatalog;
  if (target === null) current = base;
  else if (typeof target === 'string') {
    const named = knownCatalog(target);
    if (!named) throw new Error(`the catalog '${target}' is not known here`);
    current = named;
  } else current = target;
  const chain: SpecCatalog[] = [];
  const seen = new Set<string>();
  while (current !== base && current.id !== base.id) {
    if (current.id !== null) {
      if (seen.has(current.id)) throw new Error(`the catalog '${current.id}' extends itself`);
      seen.add(current.id);
    }
    chain.push(current);
    if (current.extends === null) break;
    const parent = knownCatalog(current.extends);
    if (!parent) throw new Error(`the catalog ${catalogLabel(current)} extends '${current.extends}', which is not known here`);
    current = parent;
  }
  const ordered = [base, ...chain.reverse()];
  const owner = new Map<string, [SpecComponent, string]>();
  for (const catalog of ordered) {
    for (const component of catalog.components) {
      const previous = owner.get(component.name);
      if (previous && !sameComponent(previous[0], component)) {
        throw new Error(`the catalog ${catalogLabel(catalog)} redefines <${component.name}> of ${previous[1]}: a catalog only adds`);
      }
      if (!previous) owner.set(component.name, [component, catalogLabel(catalog)]);
    }
  }
  return ordered;
};

/** What a blok is drawn with: the components of the catalog it is written for, and of those that one extends, down to the base. */
export type BlokView = {
  components: ReadonlyMap<string, SpecComponent>;
  functions: ReadonlyMap<string, VocabFunction>;
  label: string;
  /** Whether the components are every one the target draws, so an unknown one is a finding. */
  complete: boolean;
  /** The id of the catalog the view is of; null for one nothing published. */
  target: string | null;
  /** Per component of a known catalog the view is NOT of, that catalog's id (`catalog.target`). */
  foreign: ReadonlyMap<string, string>;
};

/** The view of a blok written for `target` (see `catalogChain`); the base's when null. */
export const blokView = (target: string | SpecCatalog | null = null, options: {complete?: boolean} = {}): BlokView => {
  const chain = catalogChain(target);
  const components = new Map<string, SpecComponent>();
  for (const catalog of chain) {
    for (const component of catalog.components) if (!components.has(component.name)) components.set(component.name, component);
  }
  const foreign = new Map<string, string>();
  for (const catalog of knownCatalogs()) {
    if (chain.includes(catalog) || catalog.id === null) continue;
    for (const component of catalog.components) {
      if (!components.has(component.name) && !foreign.has(component.name)) foreign.set(component.name, catalog.id);
    }
  }
  return {
    components,
    functions: loadVocabulary().functions,
    label: chain.map(catalogLabel).join(' + '),
    complete: options.complete ?? true,
    target: chain[chain.length - 1].id,
    foreign,
  };
};

/** The view of a blok that names no catalog: the base catalog's. */
export const baseBlokView = (): BlokView => blokView();

/**
 * Make a catalog known here, so a blok written for it is checked against it:
 * what an app does with the catalog of what it draws beyond the base
 * (`blokCatalogSpec` of its own contracts). Registered under the id of a
 * snapshot that ships, it stands in its place; the base catalog is never
 * replaced. Throws when it redefines a component of what it extends.
 */
export const registerBlokCatalog = (catalog: SpecCatalog): void => {
  if (catalog.id === null) throw new Error(`the catalog '${catalog.name}' has no id to be known by`);
  if (catalog.id === loadVocabulary().baseCatalog) return;
  const previous = registered.get(catalog.id);
  registered.set(catalog.id, catalog);
  defaultView = null;
  try {
    catalogChain(catalog.id);
  } catch (error) {
    if (previous) registered.set(catalog.id, previous);
    else registered.delete(catalog.id);
    throw error;
  }
};

/** Forget every catalog `registerBlokCatalog` was handed, and the app's own view (for tests). */
export const forgetBlokCatalogs = (): void => {
  registered.clear();
  defaultTarget = null;
  defaultView = null;
};

/**
 * The catalog this app draws: the one its own editor, checks and renderer
 * read a blok against when the blok names none of its own. An app that draws
 * only the base leaves it unset. Call it once at start, beside
 * `configureBlokPlatform`.
 */
export const setAppBlokCatalog = (target: string | SpecCatalog | null): void => {
  if (target !== null && typeof target !== 'string' && target.id !== null) registerBlokCatalog(target);
  defaultTarget = target !== null && typeof target !== 'string' && target.id !== null ? target.id : target;
  defaultView = null;
};

/** The app's own view: everything it draws (`setAppBlokCatalog`), the base catalog's when it set none. */
export const defaultBlokView = (): BlokView => {
  if (!defaultView) defaultView = blokView(defaultTarget);
  return defaultView;
};

/**
 * The view a blok that names `catalog` is read against: that catalog's when it
 * is known here, the app's own when the blok names none, and the base's,
 * incomplete (nothing is reported unknown), for a catalog nobody here knows.
 */
export const blokViewFor = (catalog: string | null | undefined): BlokView => {
  if (catalog === null || catalog === undefined) return baseBlokView();
  if (knownCatalog(catalog)) return blokView(catalog);
  return blokView(null, {complete: false});
};

/** Whether `target` can name a catalog at all: a published one's address, or the name of one registered in an organization. */
export const isCatalogTarget = (target: string): boolean => {
  const vocabulary = loadVocabulary();
  return vocabulary.catalogId.test(target) || vocabulary.catalogName.test(target);
};

/** The minor of the catalog the view is of that `tree` needs: the newest `since` among the components and props of that catalog it uses. */
export const minorNeeded = (tree: {component: string; props?: ReadonlyArray<{key: string}> | null; children?: readonly unknown[] | null}, view: BlokView): number => {
  const target = view.label.split(' + ').pop();
  let needed = 0;
  const visit = (node: typeof tree): void => {
    const spec = view.components.get(node.component);
    if (spec && spec.catalog === target) {
      needed = Math.max(needed, spec.since);
      for (const prop of node.props ?? []) needed = Math.max(needed, spec.props.find(candidate => candidate.key === prop.key)?.since ?? 0);
    }
    for (const child of node.children ?? []) visit(child as typeof tree);
  };
  visit(tree);
  return needed;
};

/** Whether a component is a language one that holds others in whatever context (`if`, `foreach`, `fragment`). */
export const isLanguageContainer = (component: SpecComponent | undefined): boolean =>
  component !== undefined && component.group === LANGUAGE_GROUP && component.inheritsContext && component.acceptsChildren;

/** The context a component's children are in, given the one it sits in. */
export const innerContext = (component: SpecComponent | undefined, context: BlokContextName): BlokContextName => {
  if (!component) return context;
  return component.inheritsContext ? context : component.childrenContext ?? component.context;
};
