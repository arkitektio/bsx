import {AnimateRender, AttachRender, BeamRender, GlowRender, MoveRender, RotateRender, VisibleRender, TintRender} from './bindings';
import {OnClickRender, PopoutRender} from './interaction';
import {ModelRender, RobotRender} from './Model';
import {SceneRender} from './Scene';
import {TransformRender} from './Transform';

export {SceneOwnerProvider, useSceneNotice, useSceneOverlay} from './context';
export {SceneSurface} from './Scene';

export * from './host';

/**
 * The 3D vocabulary: three containers place models, a transform places what
 * it holds (and lets a gizmo move it), eight children bind their named nodes
 * to state, and two handle interaction and HTML.
 */
export const sceneRenders = {
  Scene: SceneRender,
  Model: ModelRender,
  Robot: RobotRender,
  Transform: TransformRender,
  Move: MoveRender,
  Rotate: RotateRender,
  Animate: AnimateRender,
  Visible: VisibleRender,
  Glow: GlowRender,
  Tint: TintRender,
  Attach: AttachRender,
  Beam: BeamRender,
  OnClick: OnClickRender,
  Popout: PopoutRender,
};
