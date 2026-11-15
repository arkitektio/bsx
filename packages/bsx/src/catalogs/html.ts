import {BASE_CATALOG_REF, defineBlokCatalog} from '../renderer/runtime/catalog';
import {parts} from './parts';

/** The `html` family of the base catalog. */
export const htmlCatalog = defineBlokCatalog({
  name: "html",
  partOf: BASE_CATALOG_REF,
  description: "Plain containers that translate directly to React Native: div (View), p and span (Text).",
  components: {
    div: parts.div,
    p: {...parts.p, textProp: "text"},
    span: {...parts.span, textProp: "text"},
  },
});
