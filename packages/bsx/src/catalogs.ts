// @arkitektio/bsx/catalogs: the global catalog contracts (ui@1, html@1, logo@1, scene@1, structure@1, shadcn@1)
// and the prop-schema vocabulary to define a UI's own. zod only: no React, no DOM.
export * from './catalogs/index';
export {catalogRef, defineBlokCatalog, type BlokCatalogContract, type BlokComponentContracts} from './renderer/runtime/catalog';
export type {BlokComponentContract} from './renderer/runtime/components';
export {describeBlokContract, specJsonText, type SpecCatalogJson} from './renderer/runtime/describe';
