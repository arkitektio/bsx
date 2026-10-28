import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';
import {BlokPropSchemas} from '../../renderer/runtime/schemas';
import {actionProp, boolSchema, classNameSchema, contentSchema, layoutFields, textFields} from '../props';

/** ui@1's links and media: `Link`, `Image` and `Code`. */

export const htmlContracts = {
  Link: {
    schema: z
      .object({
        href: BlokPropSchemas.DynamicString.optional().describe('Link target URL.'),
        text: BlokPropSchemas.DynamicString.optional().describe('Link text.'),
        children: contentSchema,
        newTab: boolSchema.describe('Open in a new tab.'),
        onClick: actionProp('Runs when the link is clicked.'),
        className: classNameSchema,
        ...textFields,
      })
      .describe('A hyperlink.'),
  },
  Image: {
    schema: z
      .object({
        src: BlokPropSchemas.DynamicString.optional().describe(
          'Image URL, or an image its app registered as an asset: `{self.assets.logo}`.',
        ),
        alt: BlokPropSchemas.DynamicString.optional().describe('Alternative text.'),
        blurhash: BlokPropSchemas.DynamicString.optional().describe(
          'Blurhash shown while the image loads.',
        ),
        className: classNameSchema,
        width: layoutFields.width,
        height: layoutFields.height,
        maxWidth: layoutFields.maxWidth,
        maxHeight: layoutFields.maxHeight,
        radius: layoutFields.radius,
      })
      .describe('An image.'),
  },
  Code: {
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('The code to show.'),
        block: boolSchema.describe('A block of its own (preformatted), rather than inline.'),
        className: classNameSchema,
        ...textFields,
      })
      .describe('Code, in a monospaced face: inline, or as a block.'),
  },
} satisfies BlokComponentContracts;
