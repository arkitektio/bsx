// @vitest-environment jsdom
import * as React from 'react';
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import BlokRenderer from '../../BlokRenderer';
import {BlokRunHostProvider, BlokSpaceHostProvider, type BlokRunHost, type BlokSpaceHost} from './host';
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

describe('the argument form an assign blok places', () => {
  it('draws what the host gives for <args />, and nothing without a host', () => {
    const tree = [{id: 'root', component: 'Html', children: [{id: 'form', component: 'args'}]}];
    const run: BlokRunHost = {agentsFor: () => [], renderAsk: () => null, renderArgs: () => <div data-testid="args-form" />};
    const hosted = render(
      <BlokRunHostProvider value={run}>
        <BlokRenderer catalog={testCatalog()} uiComponents={tree} />
      </BlokRunHostProvider>,
    );
    expect(hosted.getByTestId('args-form')).toBeTruthy();
    hosted.unmount();
    const bare = render(<BlokRenderer catalog={testCatalog()} uiComponents={tree} />);
    expect(bare.queryByTestId('args-form')).toBeNull();
  });
});

describe('the time slider a task blok places', () => {
  it('draws what the host gives for <timeline />, and nothing without a host', () => {
    const tree = [{id: 'root', component: 'Html', children: [{id: 'slider', component: 'timeline'}]}];
    const run: BlokRunHost = {agentsFor: () => [], renderAsk: () => null, renderTimeline: () => <div data-testid="timeline" />};
    const hosted = render(
      <BlokRunHostProvider value={run}>
        <BlokRenderer catalog={testCatalog()} uiComponents={tree} />
      </BlokRunHostProvider>,
    );
    expect(hosted.getByTestId('timeline')).toBeTruthy();
    hosted.unmount();
    const bare = render(<BlokRenderer catalog={testCatalog()} uiComponents={tree} />);
    expect(bare.queryByTestId('timeline')).toBeNull();
  });
});

describe('what an assign blok places one by one', () => {
  it('hands <args /> its options, and <arg />, <deps />, <dep /> their keys', () => {
    const tree = [
      {
        id: 'root',
        component: 'Html',
        children: [
          {id: 'one', component: 'arg', props: [{key: 'key', static_value: 'exposure'}]},
          {id: 'rest', component: 'args', props: [{key: 'omit', static_value: 'gain offset'}, {key: 'given', static_value: 'show'}]},
          {id: 'dep', component: 'dep', props: [{key: 'key', static_value: 'robot'}]},
          {id: 'deps', component: 'deps'},
        ],
      },
    ];
    const renderArgs = vi.fn(() => <div data-testid="args-form" />);
    const run: BlokRunHost = {
      agentsFor: () => [],
      renderAsk: () => null,
      renderArgs,
      renderArg: key => <div data-testid={`arg-${key}`} />,
      renderDeps: () => <div data-testid="deps" />,
      renderDep: key => <div data-testid={`dep-${key}`} />,
    };
    const hosted = render(
      <BlokRunHostProvider value={run}>
        <BlokRenderer catalog={testCatalog()} uiComponents={tree} />
      </BlokRunHostProvider>,
    );
    expect(hosted.getByTestId('arg-exposure')).toBeTruthy();
    expect(hosted.getByTestId('dep-robot')).toBeTruthy();
    expect(hosted.getByTestId('deps')).toBeTruthy();
    expect(renderArgs).toHaveBeenLastCalledWith({only: undefined, omit: ['gain', 'offset'], given: 'show'});
  });
});

describe('what a task blok places of its run', () => {
  it('draws what the host gives for <returns /> and <status />', () => {
    const tree = [
      {
        id: 'root',
        component: 'Html',
        children: [
          {id: 'status', component: 'status'},
          {id: 'result', component: 'returns', props: [{key: 'only', static_value: ['image']}]},
        ],
      },
    ];
    const renderReturns = vi.fn(() => <div data-testid="returns" />);
    const run: BlokRunHost = {agentsFor: () => [], renderAsk: () => null, renderReturns, renderStatus: () => <div data-testid="status" />};
    const hosted = render(
      <BlokRunHostProvider value={run}>
        <BlokRenderer catalog={testCatalog()} uiComponents={tree} />
      </BlokRunHostProvider>,
    );
    expect(hosted.getByTestId('status')).toBeTruthy();
    expect(hosted.getByTestId('returns')).toBeTruthy();
    expect(renderReturns).toHaveBeenLastCalledWith({only: ['image'], omit: undefined});
  });
});
