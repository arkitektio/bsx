import {defineBlokCatalog} from '../renderer/runtime/catalog';
import {parts} from './parts';

/** `logo@1`. */
export const logoCatalog = defineBlokCatalog({
  name: "logo",
  version: 1,
  description: "SVG drawing for logos and action logos; the palette is restricted to the logo pens.",
  components: {
    ActionLogo: parts.ActionLogo,
    AgentLogo: parts.AgentLogo,
    Circle: parts.Circle,
    ClipPath: parts.ClipPath,
    Defs: parts.Defs,
    Ellipse: parts.Ellipse,
    G: parts.G,
    Line: parts.Line,
    LinearGradient: parts.LinearGradient,
    Path: parts.Path,
    Polygon: parts.Polygon,
    Polyline: parts.Polyline,
    RadialGradient: parts.RadialGradient,
    Rect: parts.Rect,
    Stop: parts.Stop,
    SvgText: parts.SvgText,
  },
});
