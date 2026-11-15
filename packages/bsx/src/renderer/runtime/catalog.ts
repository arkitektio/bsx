import type * as React from 'react';
import type {BlokComponentContract, BlokComponentDefinition, BlokRenderArgs} from './components';

/**
 * Catalogs as the UI defines them.
 *
 * A *contract* (`defineBlokCatalog`) says which components a set holds and what
 * each takes: name, schema, placement. It draws nothing. There are two sorts:
 *
 * - A *family* of the base catalog (`ui`, `html`, `shadcn`, `structure`,
 *   `scene`, `logo`): `partOf` names the catalog it is part of (`base@3`). The
 *   base catalog is the spec's, and every renderer draws it whole; the families
 *   are how this package holds its contracts, one toolkit at a time.
 * - A UI's *own* catalog (the Orkestrator's MikroScene parts): what it draws
 *   beyond the base. Given an `id` (the address it is published at) and a
 *   version it is an app catalog a blok can be written for.
 *
 * An *implementation* (`implementBlokCatalog`) is the app's: one render per
 * component of a contract, a map the compiler checks against the contract.
 */

/** The base catalog, as components of it are tagged (`origin`). */
export const BASE_CATALOG_REF = 'base@3';
/** The address the base catalog is published at: what a blok is written for when it names none. */
export const BASE_CATALOG_ADDRESS = 'https://arkitekt.live/catalogs/base/v3';

export type BlokComponentContracts = Record<string, BlokComponentContract<any>>;

export type BlokCatalogContract<TComponents extends BlokComponentContracts = BlokComponentContracts> = {
  name: string;
  /** Set on a published catalog (an app catalog's `1`); null on a family, and on a UI's own that nothing publishes. */
  version: number | null;
  description: string;
  components: TComponents;
  /** For a family: the catalog it is part of (`base@3`). Null on a catalog of its own. */
  partOf: string | null;
  /** For a published catalog: the address it is published at, which is what a blok names it by. */
  id: string | null;
  /** The id of the catalog it adds to; the base catalog's when left out. */
  extends: string | null;
};

export const defineBlokCatalog = <const TComponents extends BlokComponentContracts>(contract: {
  name: string;
  version?: number;
  description: string;
  components: TComponents;
  partOf?: string;
  id?: string;
  extends?: string;
}): BlokCatalogContract<TComponents> => ({
  ...contract,
  version: contract.version ?? null,
  partOf: contract.partOf ?? null,
  id: contract.id ?? null,
  extends: contract.extends ?? null,
});

/** How a contract is named: `name@version`, or the bare name of a family or of a UI's own unpublished catalog. */
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
    return render ? [{...component, name, render: render as React.ComponentType<BlokRenderArgs>, origin: contract.partOf ?? ref}] : [];
  });
  return {contract, components, whole: missing.length === 0};
}

/**
 * A UI's own catalog from components it defines whole, schema and render
 * together (`createBlokComponent`): the contract and its implementation at
 * once. The UI owns both, so there is nothing to check one against.
 */
export const ownBlokCatalog = (
  meta: {name: string; version?: number; description: string; id?: string; extends?: string},
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
