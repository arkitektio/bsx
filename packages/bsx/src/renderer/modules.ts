import type {BlokCatalog} from './runtime';

const moduleShadows = new WeakMap<BlokCatalog, Set<string>>();

/** Per catalog, the global component names a module drew over (`addBlokComponents`): those the module's own definition renders. */
export const moduleShadowsOf = (catalog: BlokCatalog): Set<string> => {
  const found = moduleShadows.get(catalog);
  if (found) return found;
  const created = new Set<string>();
  moduleShadows.set(catalog, created);
  return created;
};
