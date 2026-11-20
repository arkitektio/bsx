// @vitest-environment jsdom
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {parseBsx} from '../bsx/parse';
import BlokRenderer from './BlokRenderer';
import {DEPS_UNBOUND, statusAtPath, unboundDependencyStatuses} from './runtime';
import {testCatalog} from './bloks/testing';

/**
 * A dependency bound to no agent reads as failed with the code `deps.unbound`
 * (vocabulary `async.propagation`), never as ready with null; its tasks and
 * assets too, and a call to it renders disabled.
 */

afterEach(cleanup);

const tree = (source: string) => [parseBsx(source).tree];

describe('an unbound dependency', () => {
  it('reads as failed, its tasks and assets too', () => {
    const statuses = unboundDependencyStatuses(['robot']);
    for (const path of ['deps.robot', 'deps.robot.arm.mode', 'deps.robot.tasks.move', 'deps.robot.assets.urdf']) {
      expect(statusAtPath(statuses, path)).toMatchObject({status: 'failed', code: DEPS_UNBOUND});
    }
    expect(statusAtPath(statuses, 'deps.stage.arm').status).toBe('ready');
  });

  it('binds its error, with the code, in an <error> slot', () => {
    render(
      <BlokRenderer catalog={testCatalog()}
        uiComponents={tree(
          '<suspense><error><Text>{error.code}</Text></error><Text>{deps.robot.arm.mode}</Text></suspense>',
        )}
        unboundDependencies={['robot']}
      />,
    );
    expect(screen.queryByText(DEPS_UNBOUND)).not.toBeNull();
  });

  it('keeps the code through a template and a task record read', () => {
    render(
      <BlokRenderer catalog={testCatalog()}
        uiComponents={tree(
          '<suspense><error><Text>code: {error.code}</Text></error><Text>Mode: {deps.robot.arm.mode}, {deps.robot.tasks.move.status}</Text></suspense>',
        )}
        unboundDependencies={['robot']}
      />,
    );
    expect(screen.queryByText(`code: ${DEPS_UNBOUND}`)).not.toBeNull();
  });

  it('shows an inline error without a boundary, and reads its agent again once bound', () => {
    const source = '<Card><Text>{deps.robot.arm.mode}</Text></Card>';
    const {rerender} = render(
      <BlokRenderer catalog={testCatalog()} uiComponents={tree(source)} initialState={{deps: {robot: {arm: {mode: 'idle'}}}}} unboundDependencies={['robot']} />,
    );
    expect(screen.queryByText('idle')).toBeNull();
    expect(document.body.textContent).toContain('bound to no agent');
    act(() => {
      rerender(<BlokRenderer catalog={testCatalog()} uiComponents={tree(source)} initialState={{deps: {robot: {arm: {mode: 'idle'}}}}} unboundDependencies={[]} />);
    });
    expect(screen.queryByText('idle')).not.toBeNull();
  });

  it('renders a call to it disabled', () => {
    render(
      <BlokRenderer catalog={testCatalog()}
        uiComponents={tree('<Button label="Go" onClick={deps.robot.go()} />')}
        unboundDependencies={['robot']}
        unavailableDependencies={new Map([['robot', 'No agent is bound to "robot", so this does nothing']])}
      />,
    );
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('the dependencies an agent blok declares', () => {
  const source =
    '<Blok kind="agent" context="panel"><dependencies key="cells" like="self.analyze" /><Button label="Go" onClick={self.analyze(tiles: 3) with cells} /><Button label="Pick" onClick={cells.pick(microscope: "7")} /></Blok>';

  it('draw nothing, are handed to a run (given) and are picked through the host', () => {
    const dispatched: unknown[] = [];
    const picked: unknown[] = [];
    const {container} = render(
      <BlokRenderer catalog={testCatalog()}
        uiComponents={tree(source)}
        dispatchAction={action => void dispatched.push(action)}
        pickDependencies={(key, picks) => void picked.push([key, picks])}
      />,
    );
    expect(container.textContent).toBe('GoPick');
    fireEvent.click(screen.getByRole('button', {name: 'Go'}));
    expect(dispatched).toEqual([{dependency: 'self', operation: 'analyze', arguments: {tiles: 3}, given: 'cells'}]);
    fireEvent.click(screen.getByRole('button', {name: 'Pick'}));
    expect(picked).toEqual([['cells', {microscope: '7'}]]);
  });

  it('disable a call they are handed to while one of them is bound to no agent', () => {
    render(
      <BlokRenderer catalog={testCatalog()}
        uiComponents={tree(source)}
        unavailableDependencies={new Map([['cells__microscope', 'No agent is bound to "cells.microscope", so this does nothing']])}
      />,
    );
    expect((screen.getByRole('button', {name: 'Go'}) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', {name: 'Pick'}) as HTMLButtonElement).disabled).toBe(false);
  });
});
