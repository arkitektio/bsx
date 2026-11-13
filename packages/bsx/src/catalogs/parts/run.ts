import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';
import {describedString} from '../props';
import {sceneSchema} from './scene';

/**
 * The components that place an action's dependencies in 3D (scene@1). `Space`
 * is a scene whose layout is shared: a room the whole organization arranges,
 * found again by its `room` (not `id`: that is every node's own explicit id). `Placed` draws the agent a dependency is bound to
 * with that agent's own scene blok, where the room keeps it, and `Route` draws
 * a line through several.
 *
 * Which agents they draw is the run's (a task, or the dry run before one):
 * they belong in an action's own blok, whose dependencies they name.
 *
 * `Placed` and `Route` read their props through the module-level schema rather
 * than the `schema` they are handed: those schemas are exported here.
 */

export const spaceSchema = sceneSchema
  .extend({
    room: z
      .string()
      .describe(
        'The room this is, found again by it: a URI (`room:helsinki-lab`) is one room for every app of the organization, a plain key (`lab`) one for this app. Where a device stands in it is kept on the server, the same for everyone.',
      ),
  })
  .describe(
    'Root of a 3D view whose layout is shared: places the action\'s dependencies (`Placed`) in a room the organization arranges together. A device someone moved stands where they left it, for everyone; one nobody moved stands where its `Placed` says. The camera stays the viewer\'s.',
  );

export const placedSchema = z
  .object({
    dep: z.string().describe('The dependency key of the action whose agent this places.'),
    blok: describedString(
      'The scene blok of that agent to draw it with, by name. Its default scene blok when left out.',
    ),
    matrix: z
      .unknown()
      .optional()
      .describe(
        'Where it stands until someone moves it: a 4x4 affine matrix as four rows, in meters with Y up. The room\'s origin when left out.',
      ),
  })
  .describe(
    'Places the agent the run got for a dependency in the room, drawn by its own scene blok; Glow, Popout and OnClick inside it bind to that device\'s model. A key bound to several agents places each; while the room is being arranged a gizmo moves it, and where it is left is kept for everyone.',
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
    'Draws a line through the agents the run got for these dependencies, where they stand in the room. A dependency nothing places is skipped.',
  );

export const runContracts = {
  Space: {
    acceptsChildren: true,
    placement: {childrenContext: 'scene', notDownstreamOf: ['Scene', 'Space']},
    schema: spaceSchema,
  },
  Placed: {
    acceptsChildren: true,
    placement: {context: 'scene', downstreamOf: ['Space']},
    schema: placedSchema,
  },
  Route: {placement: {context: 'scene', downstreamOf: ['Space']}, schema: routeSchema},
} satisfies BlokComponentContracts;
