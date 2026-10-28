import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';
import type {BlokComponentPlacement} from '../../renderer/runtime/components';
import {markBindSchema} from '../../renderer/runtime/schemas';
import {actionProp, bindSchema, describedString} from '../props';

/**
 * The 3D vocabulary: three containers place models, a transform places what
 * it holds (and lets a gizmo move it), eight children bind their named nodes
 * to state, and two handle interaction and HTML.
 *
 * Several renders read their props through the module-level schema rather than
 * the `schema` they are handed: those schemas are exported here.
 */

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

export const sceneSchema = z
  .object({
    camera: z
      .enum(['iso', 'front', 'side', 'top'])
      .optional()
      .describe('Where the camera starts looking from; it frames the models whatever their size. Defaults to iso.'),
    grid: z.boolean().optional().describe('Whether the ground grid starts shown; the viewer can switch it. Defaults to true.'),
    height: describedString(
      'CSS height of the view, e.g. "24rem". Omit to fit the element the scene is in (24rem where that has no height of its own).',
    ),
    persist: z
      .boolean()
      .optional()
      .describe('Keep where the viewer leaves the camera (and the grid) on this device, by the scene\'s explicit id.'),
  })
  .describe(
    'Root of a 3D view: one renderer, camera and light rig. Y is up and one unit is one meter. Place Model and Robot inside.',
  );

/* -------------------------------------------------------------------------- */
/* Model and Robot                                                            */
/* -------------------------------------------------------------------------- */

const modelShape = {
  src: z
    .string()
    .describe('The 3D model to show: an asset its app registered, as in `{self.assets.scope}`.'),
  origin: describedString('Where the model sits in the scene, as "x y z" in meters.'),
  rotation: describedString('How the model is turned, as "x y z" Euler angles in radians.'),
  scale: z.number().optional().describe('Uniform scale. Defaults to 1; a model is authored in meters.'),
};

export const modelSchema = z
  .object(modelShape)
  .describe(
    'Places one GLB model in the scene. Its children bind the model\'s named nodes to state. A model that is missing or refused renders a placeholder that says why.',
  );

const jointValues = z
  .record(z.string(), z.unknown())
  .optional();

export const robotSchema = z
  .object({
    ...modelShape,
    joints: jointValues.describe(
      'Where each joint is: a map of joint name to radians (revolute, continuous) or meters (prismatic). A joint left out keeps its last value.',
    ),
    animateTo: jointValues.describe('Where each joint is going. Joints named here move at speed, or over duration.'),
    speed: z
      .unknown()
      .optional()
      .describe('How fast joints move to animateTo, in rad/s or m/s: one number for all joints or a map by joint name.'),
    duration: z
      .unknown()
      .optional()
      .describe('How long a move to animateTo takes, in seconds: one number or a map by joint name. Ignored where speed is given.'),
    onJointChange: actionProp(
      'Called when the viewer sets a joint by hand. Arguments may read event.name and event.value.',
    ),
  })
  .describe(
    'A Model with a joint table (extras.arkitekt.joints): applies a joint state map to it, including mimic joints, and clamps to limits.',
  );

const MODEL_PROP_KINDS = {src: 'ASSET'} as const;

/* -------------------------------------------------------------------------- */
/* Transform                                                                  */
/* -------------------------------------------------------------------------- */

export const transformSchema = z
  .object({
    matrix: z
      .unknown()
      .optional()
      .describe(
        'Where the children stand: a 4x4 affine matrix as four rows, in meters with Y up (as a space placement keeps it). The identity when absent or malformed.',
      ),
    bind: markBindSchema(bindSchema.describe(
      'The local holding the matrix (`bind={pose}`): read in place of `matrix`, and written by the gizmo.',
    )),
    persist: z
      .boolean()
      .optional()
      .describe('Keep where the gizmo left the children on this device, by the explicit id (unbound: the pose is the component\'s own).'),
    gizmo: z.boolean().optional().describe('Whether a gizmo moves the children. Defaults to true when bound or persisted; never shown while viewing the past.'),
    mode: z.enum(['translate', 'rotate', 'scale']).optional().describe('What the gizmo does: "translate" (the default), "rotate" or "scale".'),
    size: z.number().optional().describe('The size of the gizmo on screen. Defaults to 0.7.'),
  })
  .describe(
    'Places its children by an affine matrix. Bound (`bind={pose}`) or persisted (`id="arm-pose" persist`), a gizmo moves them and keeps the matrix.',
  );

/* -------------------------------------------------------------------------- */
/* Bindings                                                                   */
/* -------------------------------------------------------------------------- */

/** Every binding sits somewhere under the model whose nodes it names. */
const IN_MODEL: BlokComponentPlacement = {context: 'scene', downstreamOf: ['Model', 'Robot']};

/**
 * Bindings an action's overlay may also use under an `At`, on the model the
 * anchored device's scene blok loaded. Interaction (OnClick, Popout) sits here too.
 */
const IN_MODEL_OR_AT: BlokComponentPlacement = {context: 'scene', downstreamOf: ['Model', 'Robot', 'Anchor']};

const nodeProp = z.string().describe('The name of the node in the enclosing model that this binds.');

const motionShape = (unit: string, rate: string) => ({
  node: nodeProp,
  axis: z
    .string()
    .describe('The axis in the node\'s own frame: "x", "y", "z" or a vector as "x y z".'),
  value: z
    .unknown()
    .optional()
    .describe(`Where the part is, in ${unit} from the pose the model was authored in. A quantity ({magnitude, unit}) is converted.`),
  animateTo: z
    .unknown()
    .optional()
    .describe('Where the part is going. With it, the view moves there at speed (or over duration) and value corrects it.'),
  speed: z.number().optional().describe(`How fast it moves to animateTo, in ${rate}.`),
  duration: z.number().optional().describe('How long a move to animateTo takes, in seconds. Ignored when speed is given.'),
  scale: z.number().optional().describe('Multiplies the value before it is applied. Defaults to 1.'),
  offset: z.number().optional().describe(`Added after scale, in ${unit}. Defaults to 0.`),
  gain: z.number().optional().describe('Exaggerates the motion on screen only, for travel too small to see. Defaults to 1.'),
  smooth: z.boolean().optional().describe('Whether to ease toward each new value over 300 ms. Defaults to true.'),
});

export const moveSchema = z
  .object(motionShape('meters', 'm/s'))
  .describe('Translates a node along an axis by value x scale + offset meters from its authored pose.');
export const rotateSchema = z
  .object(motionShape('radians', 'rad/s'))
  .describe('Rotates a node about an axis by value x scale + offset radians from its authored pose.');

export const visibleSchema = z
  .object({
    node: nodeProp,
    on: z.boolean().nullish().describe('Whether the node is visible. Hiding a node hides everything beneath it.'),
  })
  .describe('Shows or hides a node and its whole subtree.');

export const glowSchema = z
  .object({
    node: describedString('The name of the node in the enclosing model that glows; the whole model when unset.'),
    on: z.boolean().optional().describe('Whether the node glows.'),
    intensity: z.number().optional().describe('How strongly. Defaults to 1 for materials, and to the authored intensity for a light.'),
    color: describedString('The colour of the glow: a colour role of the theme (`brand`, `success`, `chart-1`). Defaults to the material\'s own emissive colour, or white.'),
  })
  .describe('Switches the emissive output of a node\'s materials, or the intensity of a punctual light attached to it.');

export const tintSchema = z
  .object({
    node: nodeProp,
    color: describedString('The base colour to give the node: a colour role of the theme (`brand`, `muted`, `chart-3`). Without it the authored colour shows.'),
  })
  .describe('Overrides the base color of a node. Its materials are copied first, so nodes sharing them are unaffected.');

export const attachSchema = z
  .object({
    node: nodeProp,
    to: z
      .string()
      .describe('What to attach it to: a node of this model, or "<model id>:<node>" for a node of another model in the scene.'),
    on: z.boolean().nullish().describe('Whether it is attached. When false the node returns to where it was authored.'),
  })
  .describe('While `on` holds, carries a node with another node, keeping its place in the world at the moment of attaching. For picked-up objects.');

export const beamSchema = z
  .object({
    start: z.string().describe('The node the beam leaves from.'),
    end: describedString('The node the beam ends at, in this model or as "<model id>:<node>". Use this or length.'),
    length: z.number().optional().describe('How far the beam reaches along the start node\'s own Z axis, in meters. Use this or end.'),
    on: z.boolean().optional().describe('Whether the beam is drawn. Defaults to true.'),
    wavelength: z.number().optional().describe('The wavelength in nanometers, shown as its color.'),
    color: describedString('The colour of the beam: a colour role of the theme (`info`, `chart-2`, `destructive`). Takes precedence over wavelength.'),
    width: z.number().optional().describe('The diameter of the beam in meters. Defaults to 2 mm.'),
  })
  .describe('Draws a beam from one anchor to another, or for a length along an anchor\'s Z axis, following both as they move.');

export const animateSchema = z
  .object({
    clip: z.string().describe('The name of an animation clip in the enclosing model.'),
    progress: z.number().optional().describe('Where in the clip to show, from 0 (start) to 1 (end). Use this or time.'),
    time: z.number().optional().describe('Where in the clip to show, in seconds. Use this or progress.'),
    animateTo: z.number().optional().describe('The position to play to, in the unit of whichever of progress or time is used.'),
    duration: z.number().optional().describe('How long playing to animateTo takes, in seconds.'),
  })
  .describe('Scrubs a named animation clip of the model to a position, for mechanisms a single move or turn cannot describe. Never loops on its own.');

/* -------------------------------------------------------------------------- */
/* Interaction                                                                */
/* -------------------------------------------------------------------------- */

const nodeOrModelProp = describedString('The name of the node in the enclosing model; the whole model when unset.');
const titleProp = describedString('The heading of the card; it shows the node name when unset.');
const descriptionProp = describedString('A line under the heading of the card.');

export const onClickSchema = z
  .object({
    node: nodeOrModelProp,
    onClick: actionProp(
      'Called when the node is clicked (not when a drag of the view ends on it). Arguments may read event.node and event.point ([x, y, z] in meters, where it was hit).',
    ),
    open: describedString('The name of an html blok to show when the node is clicked.'),
    title: titleProp,
    description: descriptionProp,
    mode: z
      .enum(['popout', 'panel'])
      .optional()
      .describe(
        'Where the opened blok shows: "popout" as a card on the clicked spot (the viewer can drag it aside), "panel" beside the scene. Defaults to popout.',
      ),
  })
  .describe(
    'Makes a node and everything beneath it clickable, with a highlight on hover. A click runs an action, opens a blok, or both; a second click closes it, and opening one card closes the others that are not pinned.',
  );

export const popoutSchema = z
  .object({
    node: nodeOrModelProp,
    trigger: z
      .enum(['click', 'hover', 'always'])
      .optional()
      .describe('What shows the card: a click on the node, the pointer over it, or always. Defaults to click.'),
    open: z.boolean().optional().describe('Whether the card shows. When bound it decides alone and trigger is ignored.'),
    title: titleProp,
    description: descriptionProp,
  })
  .describe(
    'An HTML card anchored to a node that follows it as it moves; the viewer can drag it aside, and a line keeps pointing at the node. Its children are ordinary html components.',
  );

export const sceneContracts = {
  Scene: {
    acceptsChildren: true,
    placement: {childrenContext: 'scene', notDownstreamOf: ['Scene']},
    schema: sceneSchema,
  },
  Model: {
    acceptsChildren: true,
    placement: {context: 'scene', downstreamOf: ['Scene']},
    propKinds: MODEL_PROP_KINDS,
    schema: modelSchema,
  },
  Robot: {
    acceptsChildren: true,
    placement: {context: 'scene', downstreamOf: ['Scene']},
    propKinds: MODEL_PROP_KINDS,
    schema: robotSchema,
  },
  Transform: {
    acceptsChildren: true,
    placement: {context: 'scene', downstreamOf: ['Overlay', 'Scene']},
    schema: transformSchema,
  },
  Move: {placement: IN_MODEL, schema: moveSchema},
  Rotate: {placement: IN_MODEL, schema: rotateSchema},
  Animate: {placement: IN_MODEL, schema: animateSchema},
  Visible: {placement: IN_MODEL, schema: visibleSchema},
  Glow: {placement: IN_MODEL_OR_AT, schema: glowSchema},
  Tint: {placement: IN_MODEL, schema: tintSchema},
  Attach: {placement: IN_MODEL, schema: attachSchema},
  Beam: {placement: IN_MODEL, schema: beamSchema},
  OnClick: {placement: IN_MODEL_OR_AT, schema: onClickSchema},
  Popout: {
    acceptsChildren: true,
    placement: {...IN_MODEL_OR_AT, childrenContext: 'html'},
    schema: popoutSchema,
  },
} satisfies BlokComponentContracts;
