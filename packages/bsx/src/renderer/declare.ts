import {baseBlokCatalog} from './baseCatalog';
import {
  BASE_CATALOG_ADDRESS,
  BASE_CATALOG_REF,
  catalogRef,
  describeBlokComponent,
  extendBlokCatalog,
  type BlokCatalog,
  type BlokCatalogImplementation,
  type BlokComponentDefinition,
  type SpecCatalogJson,
} from './runtime';
import {baseCatalog} from '../spec/catalogs';
import type {BlokContextName} from '../spec/vocabulary';

/**
 * A UI's catalog, declared: what it draws, and nothing inferred.
 *
 * - `catalog` is what its renderers draw: the language's own elements and every
 *   implementation.
 * - `contexts` are the contexts in which it draws the base catalog whole
 *   (`HTML`, `SCENE`, `LOGO`): a blok written for the base catalog and drawn in
 *   one of them is known to render here.
 * - `claims` are the catalogs it speaks: the base catalog when it draws it
 *   whole in at least one context, and each published catalog of its own.
 * - Its own catalogs are part of `catalog`; what it publishes as its app
 *   catalog is `ownComponentsOf(catalog)`, which also counts what its modules
 *   add later (`addBlokComponents`).
 */
export type BlokUi = {
  name: string;
  description: string | null;
  catalog: BlokCatalog;
  implementations: readonly BlokCatalogImplementation[];
  contexts: readonly BlokContextName[];
  claims: readonly string[];
};

const CONTEXTS: readonly BlokContextName[] = ['HTML', 'SCENE', 'LOGO'];

/**
 * The context a base component counts towards: its own, and for one that
 * bridges html and another context (`Scene` opens a scene inside html), the
 * other one: a renderer that draws no 3D still draws html whole.
 */
const contextOf = (component: {context: BlokContextName; childrenContext: BlokContextName | null}): BlokContextName =>
  component.context !== 'HTML' ? component.context : (component.childrenContext ?? 'HTML');

/** The contexts in which `catalog` draws every component of the base catalog. */
export const baseContextsOf = (catalog: BlokCatalog): BlokContextName[] => {
  const components = baseCatalog().components;
  return CONTEXTS.filter(context => {
    const drawn = components.filter(component => !component.inheritsContext && contextOf(component) === context);
    return drawn.length > 0 && drawn.every(component => catalog.components.has(component.name));
  });
};

export const declareBlokUi = (declaration: {
  name: string;
  description?: string;
  implements: readonly BlokCatalogImplementation[];
}): BlokUi => {
  const implementations = declaration.implements;
  const refs = implementations.map(implementation => catalogRef(implementation.contract));
  const twice = refs.filter((ref, index) => refs.indexOf(ref) !== index);
  if (twice.length > 0) {
    throw new Error(`${declaration.name} implements ${[...new Set(twice)].join(', ')} twice`);
  }
  const catalog = extendBlokCatalog(
    baseBlokCatalog,
    declaration.name,
    implementations.flatMap(implementation => implementation.components),
  );
  const contexts = baseContextsOf(catalog);
  return {
    name: declaration.name,
    description: declaration.description ?? null,
    catalog,
    implementations,
    contexts,
    claims: [
      ...(contexts.length > 0 ? [BASE_CATALOG_REF] : []),
      ...implementations
        .filter(implementation => implementation.contract.partOf === null && implementation.contract.version !== null && implementation.whole)
        .map(implementation => catalogRef(implementation.contract))
        .sort(),
    ],
  };
};

/**
 * What a UI draws beyond the base catalog: every component of its catalog
 * that is neither the language's own nor one of the base catalog's. Its own
 * catalogs' components, and what its modules added since (`addBlokComponents`).
 */
export const ownComponentsOf = (catalog: BlokCatalog): BlokComponentDefinition[] =>
  [...catalog.components.values()].filter(
    component => catalog.base?.components.get(component.name) !== component && component.origin !== BASE_CATALOG_REF,
  );

/**
 * A UI's app catalog as the spec writes one (`{id, name, version, minor,
 * extends, components}`): what it publishes at `id`, registers with the
 * server, and hands the language (`setAppBlokCatalog(parseSpecCatalog(...))`)
 * so its own parser, checks and editor know the components only it draws.
 */
export const blokCatalogSpec = (
  meta: {id: string; name: string; version: number; minor?: number; extends?: string; description: string},
  catalog: BlokCatalog,
): SpecCatalogJson => ({
  id: meta.id,
  name: meta.name,
  version: meta.version,
  minor: meta.minor ?? 0,
  extends: meta.extends ?? BASE_CATALOG_ADDRESS,
  description: meta.description,
  components: ownComponentsOf(catalog)
    .map(component => describeBlokComponent(component.name, component))
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0)),
});
