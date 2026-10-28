import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';
import type {BlokComponentContract, BlokComponentPlacement} from '../../renderer/runtime/components';
import {loadVocabulary} from '../../spec/vocabulary';
import {actionProp, describedString} from '../props';

/**
 * The `logo@1` module of the blok language: the `AgentLogo` and `ActionLogo`
 * roots and the classic SVG elements as components.
 *
 * A logo root sits in html like `Scene` does and opens the `logo` context, so a
 * `Path` or a `Circle` is only ever placed inside one. The root names the
 * blok's context: an `AgentLogo` root is a LOGO blok, an `ActionLogo` root an
 * ACTION_LOGO blok (it reads `task`, the viewer's last task of the action); any
 * html blok may draw either too.
 *
 * A logo paints with the viewer's pens only (vocabulary `theme.logo_pens`:
 * `ink`, `brand`, ..., the status roles `success`, `warning`, `info`), drawn
 * from the brand hue as `var(--logo-*)`, or with `url(#id)` into the drawing.
 * Anything else is drawn in `ink`; the server refuses it at save.
 *
 * A shape may `animate`. It plays while the logo is hovered, and while an
 * action logo's task runs (`[data-logo-active]`); see `index.css`.
 *
 * Names are capitalised like the rest of the catalog and props are camelCase
 * (`strokeWidth`, not `stroke-width`). `Text` is the typography component, so
 * SVG text is `SvgText`.
 *
 * A node's id is the BSX `id`, and that is what a gradient or a clip path is
 * referenced by: `fill="url(#sky)"` names `<LinearGradient id="sky">`.
 */

/** The pens: what `var(--logo-<pen>)` in `index.css` draws from the brand hue (vocabulary `theme.logo_pens`). */
export const LOGO_PAINT_TOKENS: readonly string[] = loadVocabulary().theme.logoPens;

/** What a shape may play: a class `logo-anim-<name>` the stylesheet animates. */
export const LOGO_ANIMATIONS = ['spin', 'pulse', 'float', 'draw', 'march', 'blink'] as const;

const length = (description: string) =>
  z.union([z.number(), z.string()]).optional().describe(description);

export const AGENT_LOGO_ROOT = 'AgentLogo';
export const ACTION_LOGO_ROOT = 'ActionLogo';
export const LOGO_ROOTS = [AGENT_LOGO_ROOT, ACTION_LOGO_ROOT];

const IN_SVG: BlokComponentPlacement = {context: 'logo', downstreamOf: LOGO_ROOTS};

/* -------------------------------------------------------------------------- */
/* Presentation: what every shape and group may set                           */
/* -------------------------------------------------------------------------- */

const PAINT_HELP = `${LOGO_PAINT_TOKENS.join(', ')} (the viewer's pens), or url(#gradient)`;

export const presentationFields = {
  fill: describedString(`Fill paint: ${PAINT_HELP}.`),
  fillOpacity: length('Fill opacity, 0 to 1.'),
  fillRule: z.enum(['nonzero', 'evenodd']).optional().describe('Which parts of a self-intersecting shape are inside.'),
  stroke: describedString(`Stroke paint: ${PAINT_HELP}.`),
  strokeWidth: length('Stroke width, in user units.'),
  strokeOpacity: length('Stroke opacity, 0 to 1.'),
  strokeLinecap: z.enum(['butt', 'round', 'square']).optional().describe('How open line ends are drawn.'),
  strokeLinejoin: z.enum(['miter', 'round', 'bevel']).optional().describe('How corners are drawn.'),
  strokeDasharray: describedString('Dash pattern, e.g. "4 2".'),
  opacity: length('Opacity of the whole element, 0 to 1.'),
  transform: describedString('SVG transform, e.g. "rotate(45 12 12)".'),
  clipPath: describedString('url(#clip) of a ClipPath to clip by.'),
  title: describedString('Tooltip text (an SVG <title>).'),
  onClick: actionProp('Runs when the element is clicked.'),
  animate: z
    .enum(LOGO_ANIMATIONS)
    .optional()
    .describe(
      'Plays while the logo is hovered, and while an action logo\'s task runs: spin, pulse, float, draw (traces the stroke), march (moves a dashed stroke) or blink.',
    ),
  animateDelay: length('Seconds before the animation starts, to stagger shapes.'),
};

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

/** Each shape's geometry props, passed through to its SVG element as they are. */
export const shapeGeometry = {
  Path: {
    d: describedString('Path data, e.g. "M2 12h20".'),
  },
  Circle: {
    cx: length('Centre x.'),
    cy: length('Centre y.'),
    r: length('Radius.'),
  },
  Ellipse: {
    cx: length('Centre x.'),
    cy: length('Centre y.'),
    rx: length('Horizontal radius.'),
    ry: length('Vertical radius.'),
  },
  Rect: {
    x: length('Left edge.'),
    y: length('Top edge.'),
    width: length('Width.'),
    height: length('Height.'),
    rx: length('Corner radius, horizontal.'),
    ry: length('Corner radius, vertical.'),
  },
  Line: {
    x1: length('Start x.'),
    y1: length('Start y.'),
    x2: length('End x.'),
    y2: length('End y.'),
  },
  Polyline: {
    points: describedString('Points, e.g. "0,0 10,5 20,0".'),
  },
  Polygon: {
    points: describedString('Points, e.g. "0,0 10,5 20,0".'),
  },
} satisfies Record<string, Record<string, z.ZodTypeAny>>;

/** A shape: one SVG element, its geometry props plus the shared presentation. */
const shape = (description: string, geometry: Record<string, z.ZodTypeAny>) => {
  const schema: BlokComponentContract['schema'] = z
    .object({...geometry, ...presentationFields})
    .describe(description);
  return {placement: IN_SVG, schema};
};

/* -------------------------------------------------------------------------- */
/* The root                                                                   */
/* -------------------------------------------------------------------------- */

const rootSchema = (description: string) =>
  z
    .object({
      viewBox: describedString('The user coordinate system, "minX minY width height", e.g. "0 0 24 24".'),
      width: length('Width; fills its box when left out.'),
      height: length('Height; fills its box when left out.'),
      preserveAspectRatio: describedString('How the viewBox fits the box, e.g. "xMidYMid meet".'),
      title: describedString('What the drawing shows, for screen readers and as a tooltip.'),
    })
    .describe(description);

/** A drawing's root: an `<svg>` whose shapes paint with the pens. */
const logoRoot = (description: string) => ({
  acceptsChildren: true,
  placement: {childrenContext: 'logo', notDownstreamOf: LOGO_ROOTS} satisfies BlokComponentPlacement,
  schema: rootSchema(description),
});

/* -------------------------------------------------------------------------- */
/* Structure: groups, definitions, gradients, clip paths                      */
/* -------------------------------------------------------------------------- */

const gradientUnits = z
  .enum(['objectBoundingBox', 'userSpaceOnUse'])
  .optional()
  .describe('Whether the coordinates are fractions of the shape (the default) or user units.');

/** The `logo@1` module: the root, seven shapes, text, and what shapes reference. */
export const logoContracts = {
  [AGENT_LOGO_ROOT]: logoRoot(
    "The root of an agent's logo: a drawing in the viewer's pens. Its children are SVG shapes.",
  ),
  [ACTION_LOGO_ROOT]: logoRoot(
    "The root of an action's logo: a drawing in the viewer's pens that reads task (the viewer's last task of the action, idle until they run it). Its children are SVG shapes.",
  ),
  Path: shape('An SVG path.', shapeGeometry.Path),
  Circle: shape('An SVG circle.', shapeGeometry.Circle),
  Ellipse: shape('An SVG ellipse.', shapeGeometry.Ellipse),
  Rect: shape('An SVG rectangle.', shapeGeometry.Rect),
  Line: shape('An SVG line.', shapeGeometry.Line),
  Polyline: shape('An open SVG polyline.', shapeGeometry.Polyline),
  Polygon: shape('A closed SVG polygon.', shapeGeometry.Polygon),
  SvgText: {
    placement: IN_SVG,
    schema: z
      .object({
        text: describedString('The text to draw.'),
        x: length('Anchor x.'),
        y: length('Baseline y.'),
        fontSize: length('Font size, in user units.'),
        fontFamily: describedString('Font family.'),
        fontWeight: describedString('Font weight, e.g. "bold" or "600".'),
        textAnchor: z.enum(['start', 'middle', 'end']).optional().describe('Where x is on the text.'),
        dominantBaseline: z
          .enum(['auto', 'middle', 'central', 'hanging', 'alphabetic'])
          .optional()
          .describe('Where y is on the text.'),
        ...presentationFields,
      })
      .describe('Text in an SVG drawing (the SVG <text> element).'),
  },
  G: {
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z.object(presentationFields).describe('A group of SVG elements, which share its presentation and transform.'),
  },
  Defs: {
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z.object({}).describe('Definitions (gradients, clip paths) that are referenced, not drawn.'),
  },
  LinearGradient: {
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z
      .object({
        x1: length('Start x.'),
        y1: length('Start y.'),
        x2: length('End x.'),
        y2: length('End y.'),
        gradientUnits,
        gradientTransform: describedString('Transform of the gradient.'),
      })
      .describe('A linear gradient, filled by its Stop children. Referenced as url(#id) by its BSX id.'),
  },
  RadialGradient: {
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z
      .object({
        cx: length('Centre x.'),
        cy: length('Centre y.'),
        r: length('Radius.'),
        fx: length('Focal point x.'),
        fy: length('Focal point y.'),
        gradientUnits,
        gradientTransform: describedString('Transform of the gradient.'),
      })
      .describe('A radial gradient, filled by its Stop children. Referenced as url(#id) by its BSX id.'),
  },
  Stop: {
    placement: {context: 'logo', downstreamOf: ['LinearGradient', 'RadialGradient']},
    schema: z
      .object({
        offset: length('Where along the gradient, 0 to 1 or a percentage.'),
        stopColor: describedString(`The colour at this stop: ${PAINT_HELP}.`),
        stopOpacity: length('The opacity at this stop, 0 to 1.'),
      })
      .describe('One colour stop of a gradient.'),
  },
  ClipPath: {
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z
      .object({
        clipPathUnits: z
          .enum(['userSpaceOnUse', 'objectBoundingBox'])
          .optional()
          .describe('Whether its shapes are in user units (the default) or fractions of the clipped shape.'),
      })
      .describe('A clip path made of its shape children. Referenced as url(#id) by its BSX id.'),
  },
} satisfies BlokComponentContracts;
