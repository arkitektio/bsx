import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';
import {BlokPropSchemas} from '../../renderer/runtime/schemas';
import {classNameSchema, contentSchema, headingLevelSchema, textAlignSchema, textFields} from '../props';

/** Text-bearing components: `Text` (ui@1), `p` and `span` (html@1), `Heading`, `Kbd`, `Markdown`, `Time`. */

/** `Text` and `p`/`span` differ only in the element they render: one schema. */
const textComponentSchema = z
  .object({
    text: BlokPropSchemas.DynamicString.optional().describe('The text to render.'),
    children: contentSchema,
    className: classNameSchema,
    ...textFields,
  })
  .describe('A run of text.');

const headingFields = {
  text: BlokPropSchemas.DynamicString.optional().describe('The heading text.'),
  children: contentSchema,
  align: textAlignSchema,
  className: classNameSchema,
};

const timeSchema = z
  .object({
    value: z.string().nullable().describe('The moment, an ISO 8601 datetime. Null renders nothing.'),
    relative: BlokPropSchemas.DynamicBoolean.optional().describe(
      'Show the distance to now (live) or to then (travelling) instead of the moment, ticking as it changes.',
    ),
    format: z.string().nullish().describe("How an absolute moment is written, as fmt.datetime's format."),
    className: classNameSchema,
  })
  .describe("A moment, shown absolute (format) or relative ('3 hours ago'). Relative time ticks inside the component.");

export const typographyContracts = {
  Text: {schema: textComponentSchema.describe('A paragraph of text.')},
  p: {schema: textComponentSchema.describe('An HTML paragraph.')},
  span: {schema: textComponentSchema.describe('An inline run of text.')},
  Heading: {
    schema: z
      .object({...headingFields, level: headingLevelSchema})
      .describe('A section heading at an author-chosen level.'),
  },
  Kbd: {
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('The key or chord to show.'),
        children: contentSchema,
        className: classNameSchema,
      })
      .describe('A keyboard key or shortcut.'),
  },
  Markdown: {
    schema: z
      .object({
        content: BlokPropSchemas.DynamicString.optional().describe('Markdown source to render.'),
        className: classNameSchema,
      })
      .describe('Renders a Markdown document.'),
  },
  Time: {schema: timeSchema},
} satisfies BlokComponentContracts;
