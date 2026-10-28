import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';
import {
  alignSchema,
  boolSchema,
  childListSchema,
  classNameSchema,
  contentSchema,
  flexDirectionSchema,
  justifySchema,
  layoutFields,
  numberSchema,
  orientationSchema,
  sizeSchema,
  spacingSchema,
} from '../props';

/** Box and structural bloks. See `renderer/bloks/layout.tsx` for the naming convention. */

const flexSchema = z
  .object({
    children: childListSchema,
    direction: flexDirectionSchema,
    wrap: boolSchema.describe('Allow children to wrap onto multiple lines.'),
    justify: justifySchema,
    align: alignSchema,
    bordered: boolSchema.describe('Draw a border around the box.'),
    ...layoutFields,
  })
  .describe('A flexbox container.');

/**
 * A per-breakpoint value: `{base: 2, md: 4}`, mobile first, measured on the
 * grid's own width (sm 640, md 768, lg 1024, xl 1280, 2xl 1536).
 */
const responsive = <T extends z.ZodTypeAny>(value: T) =>
  z.union([
    value,
    z
      .object({
        base: value.optional(),
        sm: value.optional(),
        md: value.optional(),
        lg: value.optional(),
        xl: value.optional(),
        '2xl': value.optional(),
      })
      .strict(),
  ]);

const bentoSpanSchema = z.union([
  z.number().int().min(1),
  z.object({
    min: z.number().int().min(1).optional(),
    ideal: z.union([z.number(), z.templateLiteral([z.number(), '%'])]),
    max: z.number().int().min(1).optional(),
  }),
]);

/**
 * The layout props a `BentoItem` hands its parent. The grid solves the layout
 * from them before any item renders, so it reads them off the payload: they
 * must be static literals.
 */
export const bentoItemLayoutFields = {
  cols: responsive(bentoSpanSchema)
    .optional()
    .describe(
      'Column span: 2, {"min":1,"ideal":2,"max":3}, {"ideal":"50%"}, or one per breakpoint ({"base":1,"md":2}). Static; read by the parent BentoGrid. Defaults to 1.',
    ),
  rows: responsive(bentoSpanSchema)
    .optional()
    .describe('Row span, same forms as cols. Static; read by the parent BentoGrid. Defaults to 1.'),
  priority: responsive(z.number().min(0))
    .optional()
    .describe(
      'How strongly the item holds its ideal size: 1 normal, 2-3 key tiles, 0.5 fillers that flex first, 0 takes whatever closes the layout. Static.',
    ),
  show: responsive(z.boolean())
    .optional()
    .describe('false leaves the item out, optionally per breakpoint. Static.'),
};

export const bentoItemLayoutSchema = z.object(bentoItemLayoutFields);

/**
 * `Flex`, `Row` and `Column` are the same component over the same schema; the
 * only difference is whether the direction is author-controlled or fixed.
 */
export const layoutContracts = {
  Flex: {schema: flexSchema.describe('A flexbox container with an author-set direction.')},
  Row: {schema: flexSchema.describe('A horizontal flexbox container.')},
  Column: {schema: flexSchema.describe('A vertical flexbox container.')},
  Grid: {
    schema: z
      .object({
        children: childListSchema,
        columns: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe('Fixed column count. Omit to auto-fit on minColumnWidth.'),
        minColumnWidth: sizeSchema.describe('Minimum column width when auto-fitting.'),
        bordered: boolSchema.describe('Draw a border around the grid.'),
        ...layoutFields,
      })
      .describe('A CSS grid container.'),
  },
  div: {
    schema: z
      .object({
        children: contentSchema,
        className: classNameSchema,
        ...layoutFields,
      })
      .describe('A plain block container.'),
  },
  Spacer: {
    schema: z
      .object({
        size: sizeSchema.describe('Fixed size along the parent axis.'),
        grow: numberSchema.describe('flex-grow; defaults to 1 when no size is given.'),
      })
      .describe('Flexible empty space between siblings.'),
  },
  Separator: {
    schema: z
      .object({
        orientation: orientationSchema,
        className: classNameSchema,
      })
      .describe('A dividing line between sections.'),
  },
  AspectRatio: {
    schema: z
      .object({
        children: childListSchema,
        ratio: z.number().positive().optional().describe('Width divided by height, e.g. 1.777.'),
        className: classNameSchema,
      })
      .describe('Constrains its content to a fixed aspect ratio.'),
  },
  ScrollArea: {
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
        gap: spacingSchema,
        height: sizeSchema,
        maxHeight: sizeSchema,
      })
      .describe('A scrollable region with styled scrollbars.'),
  },
  Resizable: {
    schema: z
      .object({
        children: childListSchema.describe('ResizablePanel and ResizableHandle children.'),
        direction: flexDirectionSchema.describe('"row" splits left/right, "column" top/bottom.'),
        className: classNameSchema,
      })
      .describe('A group of user-resizable panels.'),
  },
  ResizablePanel: {
    schema: z
      .object({
        children: childListSchema,
        defaultSize: numberSchema.describe('Initial size as a percentage of the group.'),
        minSize: numberSchema.describe('Minimum size percentage.'),
        maxSize: numberSchema.describe('Maximum size percentage.'),
        className: classNameSchema,
      })
      .describe('One panel inside a Resizable group.'),
  },
  ResizableHandle: {
    schema: z
      .object({
        withHandle: boolSchema.describe('Show the grab affordance.'),
        className: classNameSchema,
      })
      .describe('The drag handle between two ResizablePanels.'),
  },
  BentoGrid: {
    schema: z
      .object({
        children: childListSchema.describe(
          'BentoItem children (their cols/rows/priority/show place them). Any other child, a foreach included, is one 1x1 tile.',
        ),
        columns: responsive(z.number().int().min(1))
          .optional()
          .describe('Column count, optionally per breakpoint: {"base":2,"md":4,"lg":6}. Defaults to 4.'),
        rowHeight: responsive(z.union([z.number(), z.string()]))
          .optional()
          .describe('Row height in px or a CSS length, optionally per breakpoint. Defaults to "10rem".'),
        holeCost: numberSchema.describe('Cost per empty cell inside the layout. Default 10.'),
        raggedCost: numberSchema.describe('Cost per empty cell along the bottom edge. Defaults to holeCost.'),
        animate: boolSchema.describe('Animate items entering, leaving and moving. Default true.'),
        appear: boolSchema.describe('Also animate the items present on first render.'),
        className: classNameSchema,
        ...layoutFields,
      })
      .describe(
        'A bento grid: tiles in order, each sized as close to its preferred span as the columns allow, packed without holes.',
      ),
  },
  BentoItem: {
    placement: {downstreamOf: ['BentoGrid']},
    schema: z
      .object({
        children: childListSchema,
        ...bentoItemLayoutFields,
        className: classNameSchema,
        ...layoutFields,
      })
      .describe('One tile of a BentoGrid; fills the cells the grid gives it.'),
  },
} satisfies BlokComponentContracts;
