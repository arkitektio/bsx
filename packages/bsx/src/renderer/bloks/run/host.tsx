import * as React from 'react';

/**
 * What an action's own blok needs from the app that shows a run of it.
 *
 * The blok core draws `Space`, `Placed`, `Route` and `ask`; it does not know
 * which agents a run got, how an agent's own scene blok is found, where a room
 * keeps its devices, or how an ask is answered. The host answers those through
 * these contexts: the run (rekuest, from the task or a dry run) and the rooms
 * (rekuest's spaces, kept on the server).
 *
 * Both are provided around the scene surface, not inside the canvas: a
 * `Popout`'s card is rendered by the scene's HTML half, outside the blok.
 */

/** An agent a run binds a dependency key to. */
export type BlokRunAgent = {id: string; name: string};

export type BlokRunHost = {
  /** The agents the run binds `key` to, in order: a key bound to several comes with each. */
  agentsFor: (key: string) => readonly BlokRunAgent[];
  /** The run's open ask, answered in place (answering resumes the run); nothing while none is open. */
  renderAsk: () => React.ReactNode;
  /** The form of the arguments of the run an assign blok starts (`<args />`); absent where no run is being started. */
  renderArgs?: () => React.ReactNode;
};

const NO_AGENTS: readonly BlokRunAgent[] = Object.freeze([]);

const DETACHED_RUN: BlokRunHost = {
  agentsFor: () => NO_AGENTS,
  renderAsk: () => null,
};

const BlokRunHostContext = React.createContext<BlokRunHost>(DETACHED_RUN);

export const BlokRunHostProvider = BlokRunHostContext.Provider;

export const useBlokRunHost = (): BlokRunHost => React.useContext(BlokRunHostContext);

/** A 4x4 affine as four rows, in meters with Y up: what a room keeps per device. */
export type BlokPose = number[][];

/**
 * One room as the host keeps it: where people left its devices. Shared, so a
 * device moved by one viewer stands there for every other.
 */
export type BlokRoom = {
  /** Where someone left the agent in this room; null where nobody moved it (its `Placed` decides). */
  poseOf: (agentId: string) => BlokPose | null;
  /**
   * Keep where the agent stands now, for everyone; `dependency` is the key it
   * was placed under. Absent where the viewer may not arrange the room.
   */
  save?: (agent: BlokRunAgent, dependency: string, pose: BlokPose) => void;
  /** Forget where the agent was left, so its `Placed` decides again. */
  reset?: (agent: BlokRunAgent) => void;
};

export type BlokSpaceHost = {
  /** The room a `Space` names (`room="room:helsinki-lab"`). A hook. */
  useRoom: (room: string) => BlokRoom;
  /**
   * Draw the agent with its own scene blok, inside the scene that is open: its
   * default scene blok, or the one named. Nothing where it has none.
   */
  renderAgent: (agentId: string, blok: string | null) => React.ReactNode;
};

const NO_ROOM: BlokRoom = {poseOf: () => null};

const DETACHED_SPACE: BlokSpaceHost = {
  useRoom: () => NO_ROOM,
  renderAgent: () => null,
};

const BlokSpaceHostContext = React.createContext<BlokSpaceHost>(DETACHED_SPACE);

export const BlokSpaceHostProvider = BlokSpaceHostContext.Provider;

export const useBlokSpaceHost = (): BlokSpaceHost => React.useContext(BlokSpaceHostContext);

/**
 * Set where what would point at a device has nothing to point at: a `Popout`
 * then shows in the side tray instead, under this title.
 */
const BlokTrayContext = React.createContext<string | null>(null);

export const BlokTrayProvider = BlokTrayContext.Provider;

export const useBlokTray = (): string | null => React.useContext(BlokTrayContext);
