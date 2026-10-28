import * as React from 'react';
import {RawInspector} from './bloks/inspector/Inspector';
import {logoBlokComponents} from './bloks/logo';
import {shadcnComposableComponents} from './bloks';
import {baseBlokCatalog} from './baseCatalog';
import {baseCatalog, standardCatalogs} from '../spec/catalogs';
import {moduleShadowsOf} from './modules';
import {blokPlatform} from '../platform';
import {extendBlokCatalog, type BlokCatalog, type BlokComponentDefinition} from './runtime';

/**
 * The catalog a blok payload is validated and rendered against: which
 * components exist (what a blok may call is the language's own). Each app composes
 * its own (`composeBlokCatalog`) from what this package draws and what the app
 * brings, and hands it down with `BlokCatalogProvider`.
 *
 * The backend does not enumerate either -- `ComponentNode.component` and
 * `UtilCall.operation` are free-form strings -- so the app's catalog is the
 * authority, and `describeBlokCatalog` turns it into the published manifest.
 */

/** What the web renderer draws: the ui@1, html@1 and logo@1 components and the inspector (scene@1 is `@arkitektio/bsx/scene`'s). */
export const webBlokComponents: readonly BlokComponentDefinition[] = [...shadcnComposableComponents, ...logoBlokComponents, RawInspector];

/** A catalog over the base one (control flow) with `components`, published under `url`. */
export const composeBlokCatalog = (url: string, components: readonly BlokComponentDefinition[]): BlokCatalog =>
  extendBlokCatalog(baseBlokCatalog, url, [...components]);

let standard: BlokCatalog | null = null;

/** The web components alone: what a renderer draws when no app gave it a catalog. */
export const standardBlokCatalog = (): BlokCatalog => (standard ??= composeBlokCatalog('https://arkitekt.live/catalogs/v1.json', webBlokComponents));

const BlokCatalogContext = React.createContext<BlokCatalog | null>(null);

/** The app's catalog, for every renderer below it. */
export const BlokCatalogProvider = ({catalog, children}: {catalog: BlokCatalog; children?: React.ReactNode}) => (
  <BlokCatalogContext.Provider value={catalog}>{children}</BlokCatalogContext.Provider>
);

/** The app's catalog when no provider says otherwise: the platform's, or the standard one. */
export const appBlokCatalog = (): BlokCatalog => blokPlatform().catalog ?? standardBlokCatalog();

/** The catalog the app provides here, or the app's. */
export const useBlokCatalog = (): BlokCatalog => React.useContext(BlokCatalogContext) ?? appBlokCatalog();

/** The names a standard catalog (`ui@1`, `scene@1`, ...) defines and base does not: what a module may draw over. */
const shadowableNames = (): ReadonlySet<string> => {
  const base = new Set(baseCatalog().components.map(component => component.name));
  return new Set(standardCatalogs().flatMap(catalog => catalog.components.map(component => component.name)).filter(name => !base.has(name)));
};

/**
 * Adds components a module brings (`ModuleBuiltins.bloks`) to the catalog, so
 * everything that reads the app's catalog (the renderer, the registrar, the
 * export) offers them. Called once, by the composition root that installs the
 * modules; core never imports a module.
 *
 * A module may draw over a standard catalog's component (its own `Slider`):
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
  const shadowable = shadowableNames();
  const shadows = moduleShadowsOf(catalog);
  const taken = components.filter(
    component => catalog.components.has(component.name) && (!shadowable.has(component.name) || shadows.has(component.name)),
  );
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
