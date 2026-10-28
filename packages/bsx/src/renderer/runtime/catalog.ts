import type * as React from 'react';
import type {BlokComponentContract, BlokComponentDefinition, BlokRenderArgs} from './components';

/**
 * Catalogs as the UI defines them.
 *
 * A *contract* (`defineBlokCatalog`) says which components a catalog holds and
 * what each takes: name, schema, placement. It draws nothing. A versioned one
 * (`ui@1`, `scene@1`) is global: every UI that implements it whole draws the
 * same bloks, and the spec publishes it. An unversioned one is a UI's own (the
 * `newswitch` catalog, orkestrator's MikroScene parts), registered with that UI.
 *
 * An *implementation* (`implementBlokCatalog`) is the app's: one render per
 * component of a contract, a map the compiler checks against the contract.
 */

export type BlokComponentContracts = Record<string, BlokComponentContract<any>>;

export type BlokCatalogContract<TComponents extends BlokComponentContracts = BlokComponentContracts> = {
  name: string;
  /** Set on a global catalog (`ui@1`); null on a UI's own. */
  version: number | null;
  description: string;
  components: TComponents;
};

export const defineBlokCatalog = <const TComponents extends BlokComponentContracts>(contract: {
  name: string;
  version?: number;
  description: string;
  components: TComponents;
}): BlokCatalogContract<TComponents> => ({...contract, version: contract.version ?? null});

/** How a catalog is named on the wire: `name@version`, or a UI's own catalog's bare name. */
export const catalogRef = (contract: Pick<BlokCatalogContract, 'name' | 'version'>): string =>
  contract.version === null ? contract.name : `${contract.name}@${contract.version}`;

/** How one component of a contract is drawn: its props typed from the contract's schema. */
export type BlokRender<TComponent extends BlokComponentContract<any>> = React.ComponentType<
  BlokRenderArgs<TComponent['schema']>
>;

/** A render for every component of `TContract`. */
export type BlokRendersOf<TContract extends BlokCatalogContract<any>> = {
  [K in keyof TContract['components']]: BlokRender<TContract['components'][K]>;
};

export type BlokCatalogImplementation = {
  contract: BlokCatalogContract;
  /** The contract's components, with this implementation's renders. */
  components: readonly BlokComponentDefinition[];
  /** Every component is drawn: the UI may claim the catalog. */
  whole: boolean;
};

/**
 * Draw `contract` with `renders`. Every component must be drawn, unless
 * `partial` says this UI draws a subset (it then does not claim the catalog,
 * and a blok naming an undrawn component gets the "unknown component" card).
 */
export function implementBlokCatalog<TContract extends BlokCatalogContract<any>>(
  contract: TContract,
  renders: BlokRendersOf<TContract>,
): BlokCatalogImplementation;
export function implementBlokCatalog<TContract extends BlokCatalogContract<any>>(
  contract: TContract,
  renders: Partial<BlokRendersOf<TContract>>,
  options: {partial: true},
): BlokCatalogImplementation;
export function implementBlokCatalog(
  contract: BlokCatalogContract,
  renders: Partial<Record<string, React.ComponentType<BlokRenderArgs<any>>>>,
  options?: {partial: true},
): BlokCatalogImplementation {
  const ref = catalogRef(contract);
  const foreign = Object.keys(renders).filter(name => !(name in contract.components));
  if (foreign.length > 0) {
    throw new Error(`${ref} holds no ${foreign.join(', ')}`);
  }
  const missing = Object.keys(contract.components).filter(name => renders[name] === undefined);
  if (missing.length > 0 && !options?.partial) {
    throw new Error(`${ref} is implemented without ${missing.join(', ')}`);
  }
  const components = Object.entries(contract.components).flatMap(([name, component]): BlokComponentDefinition[] => {
    const render = renders[name];
    return render ? [{...component, name, render: render as React.ComponentType<BlokRenderArgs>, origin: ref}] : [];
  });
  return {contract, components, whole: missing.length === 0};
}

/**
 * A UI's own catalog from components it defines whole, schema and render
 * together (`createBlokComponent`): the contract and its implementation at
 * once. The UI owns both, so there is nothing to check one against.
 */
export const ownBlokCatalog = (
  meta: {name: string; version?: number; description: string},
  components: readonly BlokComponentDefinition[],
): BlokCatalogImplementation => {
  const contract = defineBlokCatalog({
    ...meta,
    components: Object.fromEntries(
      components.map(({name, render: _render, origin: _origin, ...component}) => [name, component as BlokComponentContract]),
    ),
  });
  const ref = catalogRef(contract);
  return {contract, components: components.map(component => ({...component, origin: ref})), whole: true};
};
