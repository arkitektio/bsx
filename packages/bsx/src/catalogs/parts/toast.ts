import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';
import {BlokPropSchemas} from '../../renderer/runtime/schemas';
import {TASK_PORT, typedAs} from '../props';

/** `<Toast task={move}>` (the ui family) and its outcome slots `done`, `failed`, `cancelled`. */

const toastSchema = z
  .object({
    task: typedAs(
      z.unknown().refine(value => value !== undefined, 'A Toast follows a task.').describe('The task record to follow: an `into` name of this blok (`task={move}`), or `task`.'),
      TASK_PORT,
    ),
  })
  .describe('A notification when a task settles, once per task: its `done`, `failed` and `cancelled` slots hold the text.');

const outcomeSlot = (description: string) => ({
  // Its text children are the message (`<done>Moved {move.result}</done>`).
  acceptsChildren: true,
  placement: {downstreamOf: ['Toast']},
  schema: z
    .object({text: BlokPropSchemas.DynamicString.optional().describe('What the toast says.')})
    .describe(description),
});

export const toastContracts = {
  Toast: {acceptsChildren: true, schema: toastSchema},
  done: outcomeSlot('What a `<Toast>` says when its task is done.'),
  failed: outcomeSlot('What a `<Toast>` says when its task failed (`move.error` says why).'),
  cancelled: outcomeSlot('What a `<Toast>` says when its task was cancelled.'),
} satisfies BlokComponentContracts;
