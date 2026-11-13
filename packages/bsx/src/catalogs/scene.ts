import {defineBlokCatalog} from '../renderer/runtime/catalog';
import {parts} from './parts';

/** `scene@1`. */
export const sceneCatalog = defineBlokCatalog({
  name: "scene",
  version: 1,
  description: "3D components: the Scene and Space roots, models, verb modifiers on a model's nodes, the HTML bridge (Popout), and the placed dependencies of a Space.",
  components: {
    Animate: parts.Animate,
    Attach: parts.Attach,
    Beam: parts.Beam,
    Glow: parts.Glow,
    Model: parts.Model,
    Move: parts.Move,
    OnClick: {...parts.OnClick, events: {onClick: [{key: "node", kind: "STRING", description: "The node that was clicked."}, {key: "point", kind: "LIST", description: "Where it was hit: [x, y, z] in meters."}]}},
    Placed: parts.Placed,
    Popout: parts.Popout,
    Robot: {...parts.Robot, events: {onJointChange: [{key: "name", kind: "STRING", description: "The joint the viewer set."}, {key: "value", kind: "FLOAT", description: "Its new value."}]}},
    Rotate: parts.Rotate,
    Route: parts.Route,
    Scene: parts.Scene,
    Space: parts.Space,
    Tint: parts.Tint,
    Transform: {...parts.Transform, bindKinds: {bind: "ANY"}},
    Visible: parts.Visible,
  },
});
