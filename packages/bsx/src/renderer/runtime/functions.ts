import type {BlokComponentDefinition} from './components';

/**
 * A catalog: the components a renderer draws, by name. What a blok may call is
 * the blok language's own (`spec/vocabulary.json` functions, evaluated by
 * `functions/v2`); a catalog adds components, never functions.
 */
export type BlokCatalog = {
  id: string;
  components: Map<string, BlokComponentDefinition>;
  /**
   * The catalog this one extends (`extendBlokCatalog`): its components are part
   * of this one's map too. Unset on the base catalog.
   */
  base?: BlokCatalog;
};

export const createBlokCatalog = (id: string, components: ReadonlyArray<BlokComponentDefinition>): BlokCatalog => {
  const componentMap = new Map(components.map(component => [component.name, component]));
  // A name is one component: a second one would silently shadow the first.
  if (componentMap.size !== components.length) {
    const seen = new Set<string>();
    const repeated = components.filter(component => seen.has(component.name) || !seen.add(component.name));
    throw new Error(`Blok components named twice: ${repeated.map(component => component.name).join(', ')}`);
  }
  return {id, components: componentMap};
};

/**
 * A UI catalog over a base one: everything the base offers, and what this one
 * adds. It may add, never redefine: a component the base already holds is
 * refused, as the server refuses a UI catalog that shadows a base component.
 */
export const extendBlokCatalog = (
  base: BlokCatalog,
  id: string,
  components: ReadonlyArray<BlokComponentDefinition>,
): BlokCatalog => {
  const shadowed = components.filter(component => base.components.has(component.name)).map(component => component.name);
  if (shadowed.length > 0) {
    throw new Error(`Catalog ${id} cannot redefine base names: ${shadowed.join(', ')}`);
  }
  return {...createBlokCatalog(id, [...base.components.values(), ...components]), base};
};

export const mergeBlokCatalogs = (id: string, catalogs: ReadonlyArray<BlokCatalog>): BlokCatalog =>
  createBlokCatalog(
    id,
    catalogs.flatMap(catalog => [...catalog.components.values()]),
  );

export type BlokCatalogManifest = {
  id: string;
  components: Array<{name: string; props: string[]}>;
};

/**
 * Serializable description of what a catalog offers: its components and their
 * props, what an authoring UI needs to complete component names.
 */
export const describeBlokCatalog = (catalog: BlokCatalog): BlokCatalogManifest => ({
  id: catalog.id,
  components: [...catalog.components.values()]
    .map(component => ({
      name: component.name,
      props: Object.keys(component.schema.shape).sort(),
    }))
    .sort((left, right) => left.name.localeCompare(right.name)),
});
