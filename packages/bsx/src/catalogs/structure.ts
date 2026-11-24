import {BASE_CATALOG_REF, defineBlokCatalog} from '../renderer/runtime/catalog';
import {parts} from './parts';

/** The `structure` family of the base catalog. */
export const structureCatalog = defineBlokCatalog({
  name: "structure",
  partOf: BASE_CATALOG_REF,
  description: "Pick, show and view structures, typed by `\"@package/key\"`.",
  components: {
    StructureDisplay: parts.StructureDisplay,
    StructurePicker: {...parts.StructurePicker, events: {onChange: [{key: "value", port: {kind: "STRUCTURE", identifier: "*", nullable: true}, description: "The structure reference picked, or null when cleared."}]}, bindKinds: {bind: {kind: "STRUCTURE", identifier: "*"}}},
    StructureViewer: parts.StructureViewer,
  },
});
