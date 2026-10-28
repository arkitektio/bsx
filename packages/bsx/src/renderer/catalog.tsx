import * as React from 'react';
import {baseBlokCatalog} from './baseCatalog';
import {moduleShadowsOf} from './modules';
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

/** The app's catalog when no provider says otherwise: the platform's, or base@2 alone. */
export const appBlokCatalog = (): BlokCatalog => blokPlatform().catalog ?? baseBlokCatalog;

/** The catalog the app provides here, or the app's. */
export const useBlokCatalog = (): BlokCatalog => React.useContext(BlokCatalogContext) ?? appBlokCatalog();

/** A component of a global catalog (`ui@1`, `scene@1`): what a module may draw over. */
const isGlobal = (component: BlokComponentDefinition | undefined): boolean => component?.origin?.includes('@') === true;

/**
 * Adds components a module brings (`ModuleBuiltins.bloks`) to the catalog, so
 * everything that reads the app's catalog (the renderer, the registrar, the
 * export) offers them. Called once, by the composition root that installs the
 * modules; core never imports a module.
 *
 * A module may draw over a global catalog's component (its own `Slider`):
 * the module's is rendered, as the spec's `blok_view` says, and the validator
 * warns `catalog.shadow` where a blok uses it. Any other name the catalog
 * already holds (base's, the app's own, another module's) is refused, whoever
 * brought it. Returns the undo, which puts a drawn-over component back (a dev
 * hot reload installs the modules again).
 */
export const addBlokComponents = (
  components: readonly BlokComponentDefinition[],
  catalog: BlokCatalog,
): (() => void) => {
  const shadows = moduleShadowsOf(catalog);
  const taken = components.filter(component => {
    const held = catalog.components.get(component.name);
    return held !== undefined && (!isGlobal(held) || shadows.has(component.name));
  });
  if (taken.length > 0) {
    throw new Error(`Blok components already in the catalog: ${taken.map(component => component.name).join(', ')}`);
  }
  const previous = new Map<string, BlokComponentDefinition>();
  for (const component of components) {
    const drawnOver = catalog.components.get(component.name);
    if (drawnOver) {
      previous.set(component.name, drawnOver);
      shadows.add(component.name);
    }
    catalog.components.set(component.name, component);
  }
  return () => {
    for (const component of components) {
      if (catalog.components.get(component.name) !== component) continue;
      const restored = previous.get(component.name);
      if (restored) {
        catalog.components.set(component.name, restored);
        shadows.delete(component.name);
      } else catalog.components.delete(component.name);
    }
  };
};
