import * as React from 'react';
import {baseBlokCatalog} from './baseCatalog';
import {blokPlatform} from '../platform';
import type {BlokCatalog, BlokComponentDefinition} from './runtime';

/**
 * The catalog a blok payload is validated and rendered against: which
 * components exist (what a blok may call is the language's own). Each app
 * declares its own (`declareBlokUi`) from the catalogs it implements, and hands
 * it down with `BlokCatalogProvider` and `configureBlokPlatform({catalog})`.
 */

const BlokCatalogContext = React.createContext<BlokCatalog | null>(null);

/** The app's catalog, for every renderer below it. */
export const BlokCatalogProvider = ({catalog, children}: {catalog: BlokCatalog; children?: React.ReactNode}) => (
  <BlokCatalogContext.Provider value={catalog}>{children}</BlokCatalogContext.Provider>
);

/** The app's catalog when no provider says otherwise: the platform's, or the language's own elements alone. */
export const appBlokCatalog = (): BlokCatalog => blokPlatform().catalog ?? baseBlokCatalog;

/** The catalog the app provides here, or the app's. */
export const useBlokCatalog = (): BlokCatalog => React.useContext(BlokCatalogContext) ?? appBlokCatalog();

/**
 * Adds components a module brings (`ModuleBuiltins.bloks`) to the catalog, so
 * everything that reads the app's catalog (the renderer, the registrar, the
 * export) offers them. Called once, by the composition root that installs the
 * modules; core never imports a module.
 *
 * A catalog only adds: a name the catalog already holds (the language's, the
 * base catalog's, the app's own, another module's) is refused, whoever brought
 * it. Returns the undo (a dev hot reload installs the modules again).
 */
export const addBlokComponents = (
  components: readonly BlokComponentDefinition[],
  catalog: BlokCatalog,
): (() => void) => {
  const taken = components.filter(component => catalog.components.has(component.name));
  if (taken.length > 0) {
    throw new Error(`Blok components already in the catalog: ${taken.map(component => component.name).join(', ')}`);
  }
  for (const component of components) catalog.components.set(component.name, component);
  return () => {
    for (const component of components) {
      if (catalog.components.get(component.name) === component) catalog.components.delete(component.name);
    }
  };
};
