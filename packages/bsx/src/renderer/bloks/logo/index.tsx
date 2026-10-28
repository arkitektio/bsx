import * as React from 'react';
import type * as z from 'zod';
import {
  LOGO_ANIMATIONS,
  LOGO_PAINT_TOKENS,
  type logoContracts,
  type presentationFields,
  shapeGeometry,
} from '../../../catalogs/parts/logo';
import {
  BlokNodeErrorSurface,
  useBlok,
  useBlokDataAttributes,
  usePendingAction,
  useValue,
  type Blok,
  type BlokNodeErrorProps,
  type BlokRender,
  type BlokRenderArgs,
} from '../../runtime';

type Contracts = typeof logoContracts;

/**
 * The `logo@1` module drawn: see the contract for the language. A node's id is
 * the BSX `id`, and that is what a gradient or a clip path is referenced by.
 * Ids are made unique per drawing, so two logos on one page never share a
 * gradient.
 */

/** Which drawing a node is in: the prefix that makes its ids unique on the page. */
const SvgDrawingContext = React.createContext<string | null>(null);

const safeId = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, '_');

/** The element id of node `id` inside the drawing. */
const useElementId = (id: string) => {
  const prefix = React.useContext(SvgDrawingContext);
  return `${prefix ?? 'svg'}-${safeId(id)}`;
};

const URL_REFERENCE = /^url\(\s*#([^)\s]+)\s*\)$/;

/** `url(#name)` pointed at the element `name` became in this drawing; anything else as it was. */
const useReference = (value: string | undefined) => {
  const prefix = React.useContext(SvgDrawingContext);
  if (value === undefined) return undefined;
  const match = URL_REFERENCE.exec(value.trim());
  return match ? `url(#${prefix ?? 'svg'}-${safeId(match[1])})` : value;
};

type LogoAnimation = (typeof LOGO_ANIMATIONS)[number];

const isPaletteToken = (value: string) => LOGO_PAINT_TOKENS.includes(value);

/** A paint as drawn: a pen, a reference into the drawing; anything else in `ink`. */
const usePaint = (value: string | undefined) => {
  const reference = useReference(value);
  if (value === undefined || value === null) return undefined;
  const paint = String(value).trim();
  if (paint === 'none') return 'none';
  if (isPaletteToken(paint)) return `var(--logo-${paint})`;
  if (URL_REFERENCE.test(paint)) return reference;
  return 'var(--logo-ink)';
};

type PresentationBlok = Blok<z.ZodObject<typeof presentationFields>>;

const usePresentation = (blok: PresentationBlok) => {
  const fill = usePaint(useValue(blok.fill));
  const stroke = usePaint(useValue(blok.stroke));
  const clipPath = useReference(useValue(blok.clipPath));
  // Busy while the call it started runs: a shape cannot dispatch twice (`data-busy`).
  const {run: onClick, pending} = usePendingAction(blok.onClick);
  const requested = useValue(blok.animate);
  // A bound or computed value may name anything: only a known animation plays.
  const animate = (LOGO_ANIMATIONS as readonly string[]).includes(requested as string)
    ? (requested as LogoAnimation)
    : undefined;
  const delay = useValue(blok.animateDelay);
  const style: React.CSSProperties = {};
  if (onClick) style.cursor = 'pointer';
  if (animate && delay !== undefined) style.animationDelay = `${Number(delay)}s`;
  return {
    animate,
    props: {
      'data-busy': pending ? '' : undefined,
      fill,
      fillOpacity: useValue(blok.fillOpacity),
      fillRule: useValue(blok.fillRule),
      stroke,
      strokeWidth: useValue(blok.strokeWidth),
      strokeOpacity: useValue(blok.strokeOpacity),
      strokeLinecap: useValue(blok.strokeLinecap),
      strokeLinejoin: useValue(blok.strokeLinejoin),
      strokeDasharray: useValue(blok.strokeDasharray),
      opacity: useValue(blok.opacity),
      transform: useValue(blok.transform),
      clipPath,
      onClick,
      className: animate ? `logo-anim logo-anim-${animate}` : undefined,
      style: Object.keys(style).length ? style : undefined,
    },
    title: useValue(blok.title),
  };
};

const childrenOf = ({component, buildChild}: BlokRenderArgs) =>
  (component.children ?? []).map(child => (
    <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
  ));

/**
 * A shape: one SVG element, its geometry props passed through as they are,
 * plus the shared presentation.
 */
const shapeRender = (
  tag: 'path' | 'circle' | 'ellipse' | 'rect' | 'line' | 'polyline' | 'polygon',
  geometry: Record<string, z.ZodTypeAny>,
): BlokRender<Contracts['Path']> => {
  const keys = Object.keys(geometry);
  return ({component, schema}) => {
    const blok = useBlok(component, schema);
    const {props, title, animate} = usePresentation(blok as unknown as PresentationBlok);
    // The geometry keys are fixed per component, so the hooks run in the same order every render.
    const values = keys.map(key => [key, useValue(blok[key])] as const);
    const Element = tag as 'path';
    return (
      // `draw` traces the stroke from 0 to 1 of its length, whatever the shape's size.
      <Element {...props} {...Object.fromEntries(values)} pathLength={animate === 'draw' ? 1 : undefined}>
        {title ? <title>{title}</title> : null}
      </Element>
    );
  };
};

/* -------------------------------------------------------------------------- */
/* The root                                                                   */
/* -------------------------------------------------------------------------- */

/** Inside an `<svg>` nothing can render a `div`: a node that fails is drawn as nothing, and said so. */
const SvgNodeError = ({componentId, title, detail}: BlokNodeErrorProps) => (
  <g data-blok-error={componentId}>
    <title>{detail ? `${title}: ${detail}` : title}</title>
  </g>
);

/** A drawing's root: an `<svg>` whose shapes paint with the pens. */
const LogoRootRender: BlokRender<Contracts['AgentLogo']> = args => {
  const blok = useBlok(args.component, args.schema);
  const viewBox = useValue(blok.viewBox);
  const width = useValue(blok.width);
  const height = useValue(blok.height);
  const preserveAspectRatio = useValue(blok.preserveAspectRatio);
  const title = useValue(blok.title);
  const prefix = `svg${React.useId().replace(/[^A-Za-z0-9]/g, '')}`;
  const attributes = useBlokDataAttributes();

  return (
    <svg
      {...attributes}
      viewBox={viewBox}
      width={width ?? '100%'}
      height={height ?? '100%'}
      preserveAspectRatio={preserveAspectRatio}
      role={title ? 'img' : undefined}
      aria-label={title}
      data-blok-svg={args.component.id}
      data-blok-prefix={prefix}
      data-logo-palette=""
    >
      {title ? <title>{title}</title> : null}
      <SvgDrawingContext.Provider value={prefix}>
        <BlokNodeErrorSurface.Provider value={SvgNodeError}>{childrenOf(args)}</BlokNodeErrorSurface.Provider>
      </SvgDrawingContext.Provider>
    </svg>
  );
};

const SvgTextRender: BlokRender<Contracts['SvgText']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const {props, title} = usePresentation(blok as unknown as PresentationBlok);
  return (
    <text
      {...props}
      x={useValue(blok.x)}
      y={useValue(blok.y)}
      fontSize={useValue(blok.fontSize)}
      fontFamily={useValue(blok.fontFamily)}
      fontWeight={useValue(blok.fontWeight)}
      textAnchor={useValue(blok.textAnchor)}
      dominantBaseline={useValue(blok.dominantBaseline)}
    >
      {title ? <title>{title}</title> : null}
      {useValue(blok.text)}
    </text>
  );
};

/* -------------------------------------------------------------------------- */
/* Structure: groups, definitions, gradients, clip paths                      */
/* -------------------------------------------------------------------------- */

const GroupRender: BlokRender<Contracts['G']> = args => {
  const blok = useBlok(args.component, args.schema);
  const {props, title} = usePresentation(blok);
  return (
    <g {...props}>
      {title ? <title>{title}</title> : null}
      {childrenOf(args)}
    </g>
  );
};

const DefsRender: BlokRender<Contracts['Defs']> = args => <defs>{childrenOf(args)}</defs>;

const LinearGradientRender: BlokRender<Contracts['LinearGradient']> = args => {
  const blok = useBlok(args.component, args.schema);
  return (
    <linearGradient
      id={useElementId(args.component.id)}
      x1={useValue(blok.x1)}
      y1={useValue(blok.y1)}
      x2={useValue(blok.x2)}
      y2={useValue(blok.y2)}
      gradientUnits={useValue(blok.gradientUnits)}
      gradientTransform={useValue(blok.gradientTransform)}
    >
      {childrenOf(args)}
    </linearGradient>
  );
};

const RadialGradientRender: BlokRender<Contracts['RadialGradient']> = args => {
  const blok = useBlok(args.component, args.schema);
  return (
    <radialGradient
      id={useElementId(args.component.id)}
      cx={useValue(blok.cx)}
      cy={useValue(blok.cy)}
      r={useValue(blok.r)}
      fx={useValue(blok.fx)}
      fy={useValue(blok.fy)}
      gradientUnits={useValue(blok.gradientUnits)}
      gradientTransform={useValue(blok.gradientTransform)}
    >
      {childrenOf(args)}
    </radialGradient>
  );
};

const StopRender: BlokRender<Contracts['Stop']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  return (
    <stop offset={useValue(blok.offset)} stopColor={usePaint(useValue(blok.stopColor))} stopOpacity={useValue(blok.stopOpacity)} />
  );
};

const ClipPathRender: BlokRender<Contracts['ClipPath']> = args => {
  const blok = useBlok(args.component, args.schema);
  return (
    <clipPath id={useElementId(args.component.id)} clipPathUnits={useValue(blok.clipPathUnits)}>
      {childrenOf(args)}
    </clipPath>
  );
};

/** The `logo@1` module: the root, seven shapes, text, and what shapes reference. */
export const logoRenders = {
  AgentLogo: LogoRootRender,
  ActionLogo: LogoRootRender,
  Path: shapeRender('path', shapeGeometry.Path),
  Circle: shapeRender('circle', shapeGeometry.Circle),
  Ellipse: shapeRender('ellipse', shapeGeometry.Ellipse),
  Rect: shapeRender('rect', shapeGeometry.Rect),
  Line: shapeRender('line', shapeGeometry.Line),
  Polyline: shapeRender('polyline', shapeGeometry.Polyline),
  Polygon: shapeRender('polygon', shapeGeometry.Polygon),
  SvgText: SvgTextRender,
  G: GroupRender,
  Defs: DefsRender,
  LinearGradient: LinearGradientRender,
  RadialGradient: RadialGradientRender,
  Stop: StopRender,
  ClipPath: ClipPathRender,
};
