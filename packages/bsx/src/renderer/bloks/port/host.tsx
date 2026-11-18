import * as React from 'react';

/**
 * What a port blok needs from the form it is a field of.
 *
 * A port blok (`<Blok kind="port">`) is the widget of one port of an action's form. The blok
 * core draws its tree; the form owns the field: its label, its description, what is wrong with
 * its value, the control it would draw without a blok, and the child ports below it. A blok
 * that places one of these parts (`<label />`, `<description />`, `<message />`, `<control />`,
 * `<field key="..." />`) gets it drawn by the form through this context, and the form then
 * draws none of its own for it.
 *
 * Outside a form nothing is drawn: the parts are empty.
 */
export type BlokPortParts = {
  /** The port's label, as the form draws it (`<label />`). */
  renderLabel: () => React.ReactNode;
  /** The port's description, as the form draws it (`<description />`). */
  renderDescription: () => React.ReactNode;
  /** What the form says is wrong with the value (`<message />`); nothing while it is fine. */
  renderMessage: () => React.ReactNode;
  /** The control the form would draw for this port without a blok, bound to the port (`<control />`). */
  renderControl: () => React.ReactNode;
  /** One child port of the port, by key, as its own widget draws it (`<field key="x" />`). */
  renderField: (key: string) => React.ReactNode;
};

const DETACHED_PORT: BlokPortParts = {
  renderLabel: () => null,
  renderDescription: () => null,
  renderMessage: () => null,
  renderControl: () => null,
  renderField: () => null,
};

const BlokPortPartsContext = React.createContext<BlokPortParts>(DETACHED_PORT);

export const BlokPortPartsProvider = BlokPortPartsContext.Provider;

export const useBlokPortParts = (): BlokPortParts => React.useContext(BlokPortPartsContext);

/** What a port blok does to its port from a callback (`port.set(...)`, `port.clear()`, `port.reset()`, `port.touch()`). */
export type BlokPortOperation = 'set' | 'clear' | 'reset' | 'touch';

/** The parts a port blok may place, as its stored tree names them. */
export const BLOK_PORT_PARTS = ['label', 'description', 'message', 'control', 'field'] as const;
