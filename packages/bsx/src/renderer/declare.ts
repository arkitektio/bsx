import {baseBlokCatalog} from './baseCatalog';
import {
  catalogRef,
  describeBlokComponent,
  extendBlokCatalog,
  type BlokCatalog,
  type BlokCatalogImplementation,
  type BlokComponentDefinition,
  type SpecCatalogJson,
} from './runtime';

/**
 * A UI's catalog, declared: the catalogs it implements and nothing inferred.
 *
 * - `catalog` is what its renderers draw: base@2 and every implementation.
 * - `claims` are the global catalogs it implements whole (`ui@1`, `scene@1`):
 *   the server resolves their components from the spec, so a blok that uses
 *   only claimed catalogs is known to render here.
 * - Its own catalogs (unversioned contracts) are part of `catalog`; what it
 *   registers as its module is `moduleComponentsOf(catalog)`, which also counts
 *   what its modules add later (`addBlokComponents`).
 *
 * A global catalog implemented `partial`ly is drawn but not claimed.
 */
export type BlokUi = {
  name: string;
  description: string | null;
  catalog: BlokCatalog;
  implementations: readonly BlokCatalogImplementation[];
  claims: readonly string[];
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
  return {
    name: declaration.name,
    description: declaration.description ?? null,
    catalog: extendBlokCatalog(
      baseBlokCatalog,
      declaration.name,
      implementations.flatMap(implementation => implementation.components),
    ),
    implementations,
    claims: implementations
      .filter(implementation => implementation.contract.version !== null && implementation.whole)
      .map(implementation => catalogRef(implementation.contract))
      .sort(),
  };
};

/**
 * What a UI registers as its module (the server's `Module.components`): every
 * component of its catalog that is neither base@2's nor a global catalog's. Its
 * own catalogs' components, what its modules added since (`addBlokComponents`),
 * and a global component a module drew over (it is the module's now).
 */
export const moduleComponentsOf = (catalog: BlokCatalog): BlokComponentDefinition[] =>
  [...catalog.components.values()].filter(
    component => catalog.base?.components.get(component.name) !== component && component.origin?.includes('@') !== true,
  );

/**
 * A UI's module as the spec writes a catalog: for the language's default view
 * (`registerBlokModules([parseSpecCatalog(blokModuleSpec(...), ...)])`), so the
 * parser and the checks know the components only this UI draws.
 */
export const blokModuleSpec = (name: string, description: string, catalog: BlokCatalog): SpecCatalogJson => ({
  name,
  description,
  components: moduleComponentsOf(catalog)
    .map(component => describeBlokComponent(component.name, component))
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0)),
});
