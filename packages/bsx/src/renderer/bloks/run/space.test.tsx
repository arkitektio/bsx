// @vitest-environment jsdom
import * as React from 'react';
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import BlokRenderer from '../../BlokRenderer';
import {BlokSpaceHostProvider, type BlokSpaceHost} from './host';
import {testCatalog} from '../testing';

// No WebGL in jsdom: the canvas holds nothing here. What is checked is the frame
// around it, which a standalone Space opens itself.
vi.mock('@react-three/fiber', async importOriginal => ({
  ...(await importOriginal<typeof import('@react-three/fiber')>()),
  Canvas: () => <div data-testid="canvas" />,
}));

const prop = (key: string, value: unknown) => ({key, static_value: value});

const space = (room: string) => [
  {id: 'root', component: 'Space', props: [prop('room', room)], children: [{id: 'robot', component: 'Placed', props: [prop('dep', 'robot')]}]},
];

const host = (canSave: boolean): BlokSpaceHost => ({
  useRoom: () => ({poseOf: () => null, ...(canSave ? {save: () => undefined} : {})}),
  renderAgent: () => null,
});

const mount = (canSave: boolean, room = 'room:lab') =>
  render(
    <BlokSpaceHostProvider value={host(canSave)}>
      <BlokRenderer catalog={testCatalog()} uiComponents={space(room)} />
    </BlokSpaceHostProvider>,
  );

describe('a space shown on its own', () => {
  it('opens a scene of its own, with Arrange where the host keeps poses', () => {
    mount(true);
    expect(screen.getByTestId('canvas')).toBeTruthy();
    expect(screen.getByRole('button', {name: /arrange/i})).toBeTruthy();
  });

  it('offers no Arrange where the viewer may not keep a pose', () => {
    mount(false);
    expect(screen.getByTestId('canvas')).toBeTruthy();
    expect(screen.queryByRole('button', {name: /arrange/i})).toBeNull();
  });

  it('renders with an empty room too: its notice belongs to the scene it opens', () => {
    mount(true, '');
    expect(screen.getByTestId('canvas')).toBeTruthy();
  });
});
