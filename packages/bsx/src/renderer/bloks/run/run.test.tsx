// @vitest-environment jsdom
import * as THREE from 'three';
import {act, createRoot, extend} from '@react-three/fiber';
import {afterEach, describe, expect, it} from 'vitest';
import {fromMatrix4} from '../../../vendor/core/model/affine';
import BlokRenderer from '../../BlokRenderer';
import {createSceneStore, SceneStoreProvider, type ModelContextValue} from '../scene/context';
import {BlokSceneEmbedProvider} from '../scene/host';
import {BlokRunHostProvider, BlokSpaceHostProvider, type BlokRunAgent, type BlokRunHost, type BlokSpaceHost} from './host';
import {testCatalog} from '../testing';

// `Canvas` does this for a real scene.
extend(THREE as unknown as Parameters<typeof extend>[0]);

/** Stands in for WebGL: the scene graph is what is looked at, nothing is drawn. */
const renderer = () =>
  ({
    render: () => undefined,
    setSize: () => undefined,
    setPixelRatio: () => undefined,
    shadowMap: {},
    xr: {addEventListener: () => undefined, removeEventListener: () => undefined},
    dispose: () => undefined,
  }) as unknown as THREE.WebGLRenderer;

const arm: BlokRunAgent = {id: 'a1', name: 'Arm'};
const scope: BlokRunAgent = {id: 'a3', name: 'Scope'};
const binding: Record<string, BlokRunAgent[]> = {robot: [arm], frame: [scope]};
const run: BlokRunHost = {agentsFor: key => binding[key] ?? [], renderAsk: () => null};

/** Where the room keeps the arm: someone moved it to 5 m along x; nobody moved it unless `armKept`. */
const KEPT_ARM = fromMatrix4(new THREE.Matrix4().setPosition(5, 0, 0));

/** The rooms the host keeps, and what it was asked to draw. */
const spaceOf = (armKept: boolean, drawn: Array<[string, string | null]>): BlokSpaceHost => ({
  useRoom: () => ({poseOf: id => (armKept && id === 'a1' ? KEPT_ARM : null)}),
  renderAgent: (agentId, blok) => {
    drawn.push([agentId, blok]);
    return <group name={`agent-scene:${agentId}`} />;
  },
});

/** The arm's model, as its own scene blok would have loaded it: one mesh. */
const armModel = (): ModelContextValue => {
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
  const model: ModelContextValue = {
    instance: {
      root,
      nodes: new Map(),
      rest: new Map(),
      clips: [],
      report: {ref: '', size: 0, nodes: [], stats: {nodes: 0, triangles: 0, textures: 0, animations: 0}, joints: [], animations: [], warnings: []},
    },
    addClickable: () => () => undefined,
  };
  return model;
};

const prop = (key: string, value: unknown) => ({key, static_value: value});

/** The arm declared 1 m along x and 2 m along z; the scope 3 m along x, drawn with a named scene blok. */
const room = [
  {
    id: 'root',
    component: 'Space',
    props: [prop('room', 'room:test-lab')],
    children: [
      {
        id: 'robot',
        component: 'Placed',
        props: [prop('dep', 'robot'), prop('matrix', fromMatrix4(new THREE.Matrix4().setPosition(1, 0, 2)))],
        children: [
          {id: 'glow', component: 'Glow', props: [prop('on', true), prop('color', '#ff0000')]},
          {id: 'card', component: 'Popout', props: [prop('open', true), prop('title', 'Arm card')]},
        ],
      },
      {
        id: 'frame',
        component: 'Placed',
        props: [prop('dep', 'frame'), prop('blok', 'scope-3d'), prop('matrix', fromMatrix4(new THREE.Matrix4().setPosition(3, 0, 0)))],
      },
      {id: 'gone', component: 'Placed', props: [prop('dep', 'opentrons')]},
      {id: 'route', component: 'Route', props: [prop('through', ['robot', 'frame']), {key: 'progress', dynamic_value: {path: 'task.progress'}}]},
    ],
  },
];

const mount = async ({owned, armKept = false}: {owned?: ModelContextValue; armKept?: boolean} = {}) => {
  const store = createSceneStore();
  if (owned) store.getState().setOwnedModel('a1', 'device', owned);
  const drawn: Array<[string, string | null]> = [];
  const root = createRoot(document.createElement('canvas'));
  await root.configure({gl: renderer, frameloop: 'never', size: {width: 100, height: 100, top: 0, left: 0}});
  let state!: ReturnType<typeof root.render>;
  await act(async () => {
    state = root.render(
      <BlokRunHostProvider value={run}>
        <BlokSpaceHostProvider value={spaceOf(armKept, drawn)}>
          <SceneStoreProvider value={store}>
            <BlokSceneEmbedProvider value>
              <BlokRenderer catalog={testCatalog()} embedded uiComponents={room} initialState={{task: {progress: 50}}} />
            </BlokSceneEmbedProvider>
          </SceneStoreProvider>
        </BlokSpaceHostProvider>
      </BlokRunHostProvider>,
    );
  });
  return {store, drawn, scene: state.getState().scene, unmount: () => root.unmount()};
};

let unmount: (() => void) | undefined;
afterEach(() => unmount?.());

describe('a space placing the run\'s dependencies', () => {
  it('stands a Placed where it says while nobody moved it, and a Glow without a node lights the device', async () => {
    const model = armModel();
    const mounted = await mount({owned: model});
    unmount = mounted.unmount;

    expect(mounted.scene.getObjectByName('placed:robot:a1')?.position.toArray()).toEqual([1, 0, 2]);
    // The glow works on the model the device's scene blok loaded, not on a copy.
    const mesh = model.instance.root.children[0] as THREE.Mesh;
    const lit = mesh.material as THREE.MeshStandardMaterial;
    expect(lit.emissiveIntensity).toBe(1);
    expect(lit.emissive.getHexString()).toBe('ff0000');
  });

  it('stands a device where the room keeps it, over what its Placed says', async () => {
    const mounted = await mount({armKept: true});
    unmount = mounted.unmount;

    expect(mounted.scene.getObjectByName('placed:robot:a1')?.position.toArray()).toEqual([5, 0, 0]);
  });

  it('draws each agent with its own scene blok inside its placement: the default, or the one named', async () => {
    const mounted = await mount();
    unmount = mounted.unmount;

    expect(mounted.drawn).toEqual(expect.arrayContaining([['a1', null], ['a3', 'scope-3d']]));
    expect(mounted.scene.getObjectByName('agent-scene:a3')?.parent?.name).toBe('placed:frame:a3');
  });

  it('anchors a card at the placement while the device has no model in the scene', async () => {
    const mounted = await mount();
    unmount = mounted.unmount;

    const card = [...mounted.store.getState().overlays.values()].find(overlay => overlay.title === 'Arm card');
    expect(card?.anchor()).toBe(mounted.scene.getObjectByName('placed:robot:a1'));
  });

  it('says so when the run has no agent for a dependency', async () => {
    const mounted = await mount();
    unmount = mounted.unmount;

    expect([...mounted.store.getState().notices.values()].map(notice => notice.title)).toContain('Nothing is bound to "opentrons"');
  });

  it('draws a route through the placed agents, its head where the run is', async () => {
    const mounted = await mount();
    unmount = mounted.unmount;

    const route = mounted.scene.getObjectByName('route');
    expect(route).toBeDefined();
    const head = route?.children.find(child => (child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry.type === 'SphereGeometry');
    // Half way from (1, 0, 2) to (3, 0, 0), over the floor.
    expect(head?.position.x).toBeCloseTo(2);
    expect(head?.position.z).toBeCloseTo(1);
  });
});
