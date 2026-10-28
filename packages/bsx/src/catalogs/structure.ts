import {defineBlokCatalog} from '../renderer/runtime/catalog';
import {parts} from './parts';

/** `structure@1`. */
export const structureCatalog = defineBlokCatalog({
  name: "structure",
  version: 1,
  description: "Pick, show and view structures, typed by `\"@package/key\"`.",
  components: {
    StructureDisplay: parts.StructureDisplay,
    StructurePicker: {...parts.StructurePicker, events: {onChange: [{key: "value", kind: "DICT", description: "The structure reference picked, or null when cleared."}]}, bindKinds: {bind: "ANY"}},
    StructureViewer: parts.StructureViewer,
  },
});
