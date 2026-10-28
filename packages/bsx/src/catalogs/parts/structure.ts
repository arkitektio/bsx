import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';
import {BlokPropSchemas} from '../../renderer/runtime/schemas';
import {actionProp, bindSchema, boolSchema, classNameSchema, disabledSchema, sizeSchema, structureValueSchema} from '../props';

/**
 * structure@1: bloks over other modules' objects, by structure identifier. The
 * contract only: drawing one needs the app's smart system (its option sources,
 * displays and viewers), so every app that claims structure@1 draws it itself.
 */

const emptyTextSchema = BlokPropSchemas.DynamicString.optional().describe(
  'Shown while there is no structure.',
);

export const structureContracts = {
  StructurePicker: {
    schema: z
      .object({
        identifier: z
          .string()
          .optional()
          .describe(
            'The kind of structure to pick, e.g. "@mikro/arraydataset". As the widget of an action input it defaults to the structure the input is typed on.',
          ),
        bind: bindSchema,
        value: structureValueSchema.describe('Controlled value, a structure reference.'),
        query: z
          .string()
          .optional()
          .describe(
            'The GraphQL query that lists the candidates, run on the `ward` service: one `query` operation, never a mutation. It selects a list aliased `options` with `value` (the id), `label` and optionally `description`, and may declare: $search: String (what the user typed), $values: [ID!] (ids to resolve), $limit: Int and $offset: Int (a page), $requires (the constraints of the action input being filled). Any other variable is read from `variables`, else from the data path of the same name; a structure held there is passed as its id. A nullable one narrows the list while it has a value and the user may lift it; the picker waits for one declared non-null. Without a query the module that owns the structure answers.',
          ),
        ward: z
          .string()
          .optional()
          .describe('The service that runs `query`, by its key, e.g. "mikro".'),
        variables: z
          .record(z.string(), z.unknown())
          .nullish()
          .describe('Values for the variables `query` declares beyond the ones the picker supplies.'),
        placeholder: BlokPropSchemas.DynamicString.optional().describe(
          'Shown while nothing is selected.',
        ),
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp(
          'Runs on selection. event.value is the structure reference, or null when cleared.',
        ),
      })
      .describe(
        'A search-backed picker for one structure of a given identifier. Writes {"object", "__identifier"}, or null when cleared. The candidates come from its `query`, or from the module that owns the structure when it has none.',
      ),
  },
  StructureDisplay: {
    schema: z
      .object({
        value: structureValueSchema.describe('The structure to show.'),
        variant: z
          .enum(['inline', 'avatar', 'chip', 'card'])
          .optional()
          .describe('How much of it to show. Defaults to "card".'),
        link: boolSchema.describe("Link to the structure's own page."),
        emptyText: emptyTextSchema,
        className: classNameSchema,
      })
      .describe('Shows a structure through the display of the module that owns it.'),
  },
  StructureViewer: {
    schema: z
      .object({
        value: structureValueSchema.describe('The structure to open.'),
        height: sizeSchema.describe('CSS height of the viewer. Defaults to "24rem".'),
        minHeight: sizeSchema.describe('CSS minimum height of the viewer.'),
        controls: boolSchema.describe("Show the viewer's own controls. Defaults to true."),
        emptyText: emptyTextSchema,
        className: classNameSchema,
      })
      .describe(
        'An interactive viewer for a structure (a mikro image or scene), provided by the module that owns it.',
      ),
  },
} satisfies BlokComponentContracts;
