import {BASE_CATALOG_REF, defineBlokCatalog} from '../renderer/runtime/catalog';
import {parts} from './parts';

/** The `logo` family of the base catalog. */
export const logoCatalog = defineBlokCatalog({
  name: "logo",
  partOf: BASE_CATALOG_REF,
  description: "SVG drawing for logos and action logos; the palette is restricted to the logo pens.",
  components: {
    Circle: parts.Circle,
    ClipPath: parts.ClipPath,
    Defs: parts.Defs,
    Ellipse: parts.Ellipse,
    G: parts.G,
    Line: parts.Line,
    LinearGradient: parts.LinearGradient,
    Logo: parts.Logo,
    Path: parts.Path,
    Polygon: parts.Polygon,
    Polyline: parts.Polyline,
    RadialGradient: parts.RadialGradient,
    Rect: parts.Rect,
    Stop: parts.Stop,
    SvgText: parts.SvgText,
  },
});
