// @arkitektio/bsx/scene: scene@1 drawn with three, @react-three/fiber and drei (opt-in: an app passes
// threeScene to declareBlokUi), and the scene and run hosts the renderer mounts.
import {sceneCatalog} from './catalogs/index';
import {runRenders} from './renderer/bloks/run';
import {sceneRenders} from './renderer/bloks/scene';
import {implementBlokCatalog} from './renderer/runtime/catalog';

export * from './renderer/bloks/scene';
export * from './renderer/bloks/run';

const renders = {...sceneRenders, ...runRenders};

/** scene@1, drawn with three. */
export const threeScene = implementBlokCatalog(sceneCatalog, {
  Animate: renders.Animate,
  Attach: renders.Attach,
  Beam: renders.Beam,
  Glow: renders.Glow,
  Model: renders.Model,
  Move: renders.Move,
  OnClick: renders.OnClick,
  Placed: renders.Placed,
  Popout: renders.Popout,
  Robot: renders.Robot,
  Rotate: renders.Rotate,
  Route: renders.Route,
  Scene: renders.Scene,
  Space: renders.Space,
  Tint: renders.Tint,
  Transform: renders.Transform,
  Visible: renders.Visible,
});
