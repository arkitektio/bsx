import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';
import {describedString} from '../props';

/**
 * The components only an action's own blok holds: they read the run it is
 * shown for (scene@1). `Overlay` is the root of one drawn into the space
 * hosting the run, `Anchor` anchors at the agent a dependency is bound to,
 * and `Route` draws a line through several.
 *
 * `Anchor` and `Route` read their props through the module-level schema rather
 * than the `schema` they are handed: those schemas are exported here.
 */

const overlaySchema = z
  .object({})
  .describe(
    'Root of an action\'s overlay: drawn into the space that hosts a run of the action, in its world coordinates, over the agents placed there. It owns no canvas. Place Anchor and Route inside.',
  );

export const anchorSchema = z
  .object({
    dep: z.string().describe('The dependency key of the action whose agent this anchors at.'),
  })
  .describe(
    'Anchors its children at the agent the run got for a dependency, where it stands in the hosting space; Glow, Popout and OnClick inside it bind to that device\'s model as its scene blok loaded it. A key bound to several agents anchors at each; an agent the space does not place shows in a side tray.',
  );

export const routeSchema = z
  .object({
    through: z
      .unknown()
      .refine(value => value !== undefined, 'A Route runs through dependencies.')
      .describe('The dependency keys the line runs through, in order: `through={["robot", "frame", "robot"]}`.'),
    progress: z
      .number()
      .nullish()
      .describe('How far along the run is, from 0 to 100 (`task.progress`): the way behind is drawn solid, a marker stands at the head.'),
    color: describedString('The colour of the line: a colour role of the theme, usually a chart role (`chart-2`). Defaults to `chart-1`.'),
  })
  .describe(
    'Draws a line through the agents the run got for these dependencies, where they stand in the hosting space. A dependency whose agent is not placed there is skipped.',
  );

export const runContracts = {
  Overlay: {
    acceptsChildren: true,
    placement: {childrenContext: 'scene', notDownstreamOf: ['Scene', 'Overlay']},
    schema: overlaySchema,
  },
  Anchor: {
    acceptsChildren: true,
    placement: {context: 'scene', downstreamOf: ['Overlay']},
    schema: anchorSchema,
  },
  Route: {placement: {context: 'scene', downstreamOf: ['Overlay']}, schema: routeSchema},
} satisfies BlokComponentContracts;
