import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';
import {BlokPropSchemas} from '../../renderer/runtime/schemas';
import {
  badgeVariantSchema,
  childListSchema,
  classNameSchema,
  contentSchema,
  numberSchema,
  sizeSchema,
} from '../props';
import {iconNameSchema} from './icons';

/** Status, progress and empty-state components: `Alert`, `Badge`, `Progress`, `Skeleton`, `Spinner`, `Empty`. */

export const feedbackContracts = {
  Alert: {
    schema: z
      .object({
        title: BlokPropSchemas.DynamicString.optional().describe('Alert heading.'),
        description: BlokPropSchemas.DynamicString.optional().describe('Supporting text.'),
        icon: iconNameSchema.describe('Icon shown beside the heading.'),
        children: childListSchema.describe('Extra content below the description.'),
        variant: z
          .enum(['default', 'destructive'])
          .optional()
          .describe('Alert appearance.'),
        className: classNameSchema,
      })
      .describe('A callout that draws attention to a message.'),
  },
  Badge: {
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('Badge text.'),
        icon: iconNameSchema.describe('Icon rendered before the text.'),
        children: contentSchema,
        className: classNameSchema,
        variant: badgeVariantSchema,
      })
      .describe('A small status or count label.'),
  },
  Progress: {
    schema: z
      .object({
        value: numberSchema.describe('Completion between 0 and max.'),
        max: numberSchema.describe('Maximum value. Defaults to 100.'),
        className: classNameSchema,
      })
      .describe('A determinate progress bar.'),
  },
  Skeleton: {
    schema: z
      .object({
        width: sizeSchema,
        height: sizeSchema,
        className: classNameSchema,
      })
      .describe('A placeholder block shown while content loads.'),
  },
  Spinner: {
    schema: z
      .object({
        className: classNameSchema,
      })
      .describe('An indeterminate loading indicator.'),
  },
  Empty: {
    schema: z
      .object({
        title: BlokPropSchemas.DynamicString.optional().describe('Empty-state heading.'),
        description: BlokPropSchemas.DynamicString.optional().describe('Supporting text.'),
        icon: iconNameSchema.describe('Icon shown above the heading.'),
        children: childListSchema.describe('Actions offered in the empty state.'),
        className: classNameSchema,
      })
      .describe('The placeholder shown when there is nothing to list.'),
  },
} satisfies BlokComponentContracts;
