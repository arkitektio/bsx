// @arkitektio/bsx/catalogs: the contracts of the base catalog's families (ui, html, logo, scene, structure, shadcn)
// and the prop-schema vocabulary to define a UI's own. zod only: no React, no DOM.
export * from './catalogs/index';
export {
  BASE_CATALOG_ADDRESS,
  BASE_CATALOG_REF,
  catalogRef,
  defineBlokCatalog,
  type BlokCatalogContract,
  type BlokComponentContracts,
} from './renderer/runtime/catalog';
export type {BlokComponentContract, BlokEventField} from './renderer/runtime/components';
export {markPortSchema, markStructureSchema, markTextSchema} from './renderer/runtime/schemas';
export {asPort, zodToPort} from './catalogs/zodToPort';
export {portJson, portSummary, TEXT_PORT, type SpecChildPort, type SpecPort} from './spec/ports';
export {describeBlokContract, specJsonText, type SpecCatalogJson} from './renderer/runtime/describe';
