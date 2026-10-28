import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';
import {BlokPropSchemas} from '../../renderer/runtime/schemas';
import {
  actionProp,
  alignSchema,
  boolSchema,
  childListSchema,
  classNameSchema,
  contentSchema,
  justifySchema,
  layoutFields,
  numberSchema,
  spacingSchema,
  textAlignSchema,
} from '../props';
import {iconNameSchema} from './icons';

/** Content containers, tables, media and charts. */

/** `CardTitle` and `CardDescription` differ only in the element they render. */
const cardTextContract = (description: string) => ({
  schema: z
    .object({
      text: BlokPropSchemas.DynamicString.optional().describe('The text to render.'),
      children: contentSchema,
      className: classNameSchema,
      align: textAlignSchema,
    })
    .describe(description),
});

const tablePartContract = (description: string) => ({
  schema: z
    .object({
      children: childListSchema,
      className: classNameSchema,
    })
    .describe(description),
});

/** `TableHead` and `TableCell` share one shape over two elements. */
const tableCellContract = (description: string) => ({
  schema: z
    .object({
      text: BlokPropSchemas.DynamicString.optional().describe('Cell text.'),
      children: contentSchema,
      align: textAlignSchema,
      className: classNameSchema,
    })
    .describe(description),
});

const chartSeriesSchema = z.object({
  key: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
});

export const dataContracts = {
  Card: {
    schema: z
      .object({
        children: childListSchema,
        size: z.enum(['default', 'sm']).optional().describe('Card density.'),
        className: classNameSchema,
        padding: spacingSchema,
        width: layoutFields.width,
        minHeight: layoutFields.minHeight,
        height: layoutFields.height,
        background: layoutFields.background,
        borderColor: layoutFields.borderColor,
        radius: layoutFields.radius,
      })
      .describe('A bordered surface grouping related content.'),
  },
  CardHeader: {
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
        padding: spacingSchema,
        gap: spacingSchema,
      })
      .describe('The header region of a Card.'),
  },
  CardTitle: cardTextContract('The title of a Card.'),
  CardDescription: cardTextContract('Supporting text under a CardTitle.'),
  CardContent: {
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
        padding: spacingSchema,
        gap: spacingSchema,
      })
      .describe('The body region of a Card.'),
  },
  CardFooter: {
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
        justify: justifySchema,
        align: alignSchema,
        gap: spacingSchema,
        padding: spacingSchema,
      })
      .describe('The footer region of a Card.'),
  },
  Table: {
    schema: z
      .object({
        children: childListSchema.describe('TableHeader, TableBody and TableFooter children.'),
        caption: BlokPropSchemas.DynamicString.optional().describe('Caption below the table.'),
        className: classNameSchema,
      })
      .describe('A styled data table. Use the lowercase table element for a plain one.'),
  },
  TableHeader: tablePartContract('The header row group of a Table.'),
  TableBody: tablePartContract('The body row group of a Table.'),
  TableFooter: tablePartContract('The footer row group of a Table.'),
  TableRow: {
    schema: z
      .object({
        children: childListSchema.describe('TableHead or TableCell children.'),
        onClick: actionProp('Runs when the row is clicked.'),
        className: classNameSchema,
      })
      .describe('One row of a Table.'),
  },
  TableHead: tableCellContract('A header cell of a Table.'),
  TableCell: tableCellContract('A cell of a Table.'),
  Avatar: {
    schema: z
      .object({
        src: BlokPropSchemas.DynamicString.optional().describe(
          'Image URL, or an image its app registered as an asset: `{self.assets.logo}`.',
        ),
        alt: BlokPropSchemas.DynamicString.optional().describe('Alternative text.'),
        fallback: BlokPropSchemas.DynamicString.optional().describe(
          'Initials shown while the image is missing.',
        ),
        size: z.enum(['default', 'sm', 'lg']).optional().describe('Avatar size.'),
        className: classNameSchema,
      })
      .describe('A user or entity avatar.'),
  },
  ItemGroup: {
    schema: z
      .object({
        children: childListSchema.describe('Item children.'),
        className: classNameSchema,
      })
      .describe('A vertical list of Items.'),
  },
  Item: {
    schema: z
      .object({
        title: BlokPropSchemas.DynamicString.optional().describe('Item title.'),
        description: BlokPropSchemas.DynamicString.optional().describe('Supporting text.'),
        icon: iconNameSchema.describe('Icon shown in the media slot.'),
        children: childListSchema.describe('Controls shown in the actions slot.'),
        variant: z
          .enum(['default', 'outline', 'muted'])
          .optional()
          .describe('Item appearance.'),
        size: z.enum(['default', 'sm']).optional().describe('Item density.'),
        onClick: actionProp('Runs when the item is clicked.'),
        className: classNameSchema,
      })
      .describe('A list row with a title, description and actions.'),
  },
  Carousel: {
    schema: z
      .object({
        children: childListSchema.describe('CarouselItem children.'),
        orientation: z
          .enum(['horizontal', 'vertical'])
          .optional()
          .describe('Scroll direction.'),
        showControls: boolSchema.describe('Show previous/next buttons. Defaults to true.'),
        className: classNameSchema,
      })
      .describe('A horizontally scrolling set of slides.'),
  },
  CarouselItem: {
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
      })
      .describe('One slide of a Carousel.'),
  },
  /**
   * The one component in the catalog that is configured by data rather than by
   * subcomponents: recharts series are options, not slots, and a `LineChart`
   * built out of per-series bloks would be a worse authoring experience than the
   * array it is really describing.
   */
  Chart: {
    schema: z
      .object({
        type: z
          .enum(['line', 'bar', 'area', 'pie'])
          .optional()
          .describe('Chart kind. Defaults to "line".'),
        data: z
          .array(z.record(z.string(), z.unknown()))
          .optional()
          .describe('One object per point, keyed by category and series key.'),
        categoryKey: z
          .string()
          .optional()
          .describe('Key holding the x-axis (or slice) label. Defaults to "name".'),
        series: z
          .array(chartSeriesSchema)
          .optional()
          .describe('Series to plot: {key, label?, color?} per entry.'),
        stacked: boolSchema.describe('Stack bar or area series.'),
        showGrid: boolSchema.describe('Draw the cartesian grid. Defaults to true.'),
        showLegend: boolSchema.describe('Show the legend.'),
        height: numberSchema.describe('Chart height in pixels.'),
        className: classNameSchema,
      })
      .describe('A line, bar, area or pie chart over tabular data.'),
  },
} satisfies BlokComponentContracts;
