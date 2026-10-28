import {defineBlokCatalog} from '../renderer/runtime/catalog';
import {parts} from './parts';

/** `html@1`. */
export const htmlCatalog = defineBlokCatalog({
  name: "html",
  version: 1,
  description: "Plain containers that translate directly to React Native: div (View), p and span (Text).",
  components: {
    div: parts.div,
    p: {...parts.p, textProp: "text"},
    span: {...parts.span, textProp: "text"},
  },
});
