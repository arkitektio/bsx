import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';

/** Debug views. */

export const inspectorContracts = {
  RawInspector: {
    schema: z
      .object({
        name: z.string().describe('Label for the inspected node.'),
      })
      .describe('Debug view of a node\'s raw props.'),
  },
} satisfies BlokComponentContracts;
