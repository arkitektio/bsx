// @vitest-environment jsdom
import {act, cleanup, fireEvent, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {foreachItemIds} from './control';
import {renderBsx, testCatalog} from './testing';

/**
 * The language of base@2 rendered end to end, from BSX: branches, loops, the
 * `when` guard, and the async model (suspense, fallback, error, stale).
 */

afterEach(() => cleanup());

const render = (source: string, state?: unknown, options?: Parameters<typeof renderBsx>[3]) =>
  renderBsx(testCatalog(), source, state, options);

describe('if / else', () => {
  const source =
    '<if when={run.failed}><Text>Failed</Text><else when={run.done}><Text>Done</Text></else><else><Text>Running</Text></else></if>';

  it('renders the then-branch, an else-if, or the last else', () => {
    const {store} = render(source, {run: {failed: false, done: false}});
    expect(screen.queryByText('Running')).not.toBeNull();
    act(() => store.getState().setRuntimeValue('run.done', true));
    expect(screen.queryByText('Done')).not.toBeNull();
    expect(screen.queryByText('Running')).toBeNull();
    act(() => store.getState().setRuntimeValue('run.failed', true));
    expect(screen.queryByText('Failed')).not.toBeNull();
    expect(screen.queryByText('Done')).toBeNull();
  });

  it('never reads an inactive branch: a pending read there suspends nothing', () => {
    render('<if when={flag}><Text>{deps.robot.arm.mode}</Text><else><Text>Off</Text></else></if>', {flag: false}, {
      statuses: {'deps.robot.arm': {status: 'pending'}},
    });
    expect(screen.queryByText('Off')).not.toBeNull();
    expect(document.querySelector('[data-blok-pending]')).toBeNull();
  });
});

describe('the when guard', () => {
  it('guards the one component it is on', () => {
    const {store} = render('<Card><Text when={move.failed}>Move failed</Text><Text>Always</Text></Card>', {move: {failed: false}});
    expect(screen.queryByText('Move failed')).toBeNull();
    expect(screen.queryByText('Always')).not.toBeNull();
    act(() => store.getState().setRuntimeValue('move.failed', true));
    expect(screen.queryByText('Move failed')).not.toBeNull();
  });
});

describe('match', () => {
  const source =
    '<match value={job.status}><case is="running"><Text>Running</Text></case><case is={3}><Text>Three</Text></case><default><Text>Idle</Text></default></match>';

  it('renders the first case equal to the value, else the default', () => {
    const {store} = render(source, {job: {status: 'running'}});
    expect(screen.queryByText('Running')).not.toBeNull();
    act(() => store.getState().setRuntimeValue('job.status', 3));
    expect(screen.queryByText('Three')).not.toBeNull();
    // A literal is a literal: "3" is not 3.
    act(() => store.getState().setRuntimeValue('job.status', '3'));
    expect(screen.queryByText('Idle')).not.toBeNull();
  });
});

describe('foreach', () => {
  it('renders once per item, keyed by key', () => {
    render('<Card><foreach items={args.positions} let="p" key={p.id}><Text>{p.name}</Text></foreach></Card>', {
      args: {positions: [{id: 'a', name: 'Home'}, {id: 'b', name: 'Dock'}]},
    });
    expect(screen.queryByText('Home')).not.toBeNull();
    expect(screen.queryByText('Dock')).not.toBeNull();
  });

  it('iterates a computed list, its items read by value', () => {
    render('<Card><foreach items={list.reverse(xs)} let="x" key={x}><Text>{x}</Text></foreach></Card>', {xs: ['one', 'two']});
    const texts = [...document.querySelectorAll('p')].map(element => element.textContent);
    expect(texts).toEqual(['two', 'one']);
  });

  it('renders without key, its items keyed by position', () => {
    const {store} = render('<Card><foreach items={xs} let="x"><Text>{x}</Text></foreach></Card>', {xs: ['one', 'two']});
    expect([...document.querySelectorAll('p')].map(element => element.textContent)).toEqual(['one', 'two']);
    act(() => store.getState().setRuntimeValue('xs', ['one', 'two', 'three']));
    expect([...document.querySelectorAll('p')].map(element => element.textContent)).toEqual(['one', 'two', 'three']);
  });

  describe('inside another foreach', () => {
    const rows = [
      {id: 'r1', cells: [{id: 'c1', name: 'One'}, {id: 'c2', name: 'Two'}]},
      {id: 'r2', cells: [{id: 'c3', name: 'Three'}]},
    ];
    const nested = (items: string) =>
      `<Card><foreach items={${items}} let="row" key={row.id}><foreach items={row.cells} let="cell" key={cell.id}><Text>{cell.name}</Text></foreach></foreach></Card>`;
    const texts = () => [...document.querySelectorAll('p')].map(element => element.textContent);

    it('reads the fields of items of a list on the outer item', () => {
      render(nested('rows'), {rows});
      expect(texts()).toEqual(['One', 'Two', 'Three']);
    });

    it('reads them when the outer list is on the agent', () => {
      render(nested('self.rows'), {deps: {self: {rows}}});
      expect(texts()).toEqual(['One', 'Two', 'Three']);
    });

    it('reads them when the outer items came by value', () => {
      render(nested('list.reverse(rows)'), {rows});
      expect(texts()).toEqual(['Three', 'One', 'Two']);
    });

    it('reads them through a third level', () => {
      const deep = [{id: 'a', rows: [{id: 'b', cells: [{id: 'c', name: 'Deep'}]}]}];
      render(
        '<Card><foreach items={outer} let="o" key={o.id}><foreach items={o.rows} let="r" key={r.id}><foreach items={r.cells} let="c" key={c.id}><Text>{c.name}</Text></foreach></foreach></foreach></Card>',
        {outer: deep},
      );
      expect(texts()).toEqual(['Deep']);
    });

    it('keys its items by their own field, not by a missing one', () => {
      const {store} = render(nested('rows'), {rows});
      const before = document.querySelectorAll('p')[1];
      act(() => store.getState().setRuntimeValue('rows/0/cells', [rows[0].cells[1], rows[0].cells[0]]));
      expect(texts()).toEqual(['Two', 'One', 'Three']);
      expect(document.querySelectorAll('p')[0]).toBe(before);
    });

    it('follows the live data', () => {
      const {store} = render(nested('rows'), {rows});
      act(() => store.getState().setRuntimeValue('rows/1/cells/0/name', 'Changed'));
      expect(texts()).toEqual(['One', 'Two', 'Changed']);
    });

    it('writes a bound control to the real list', () => {
      const {store} = render(
        '<Card><foreach items={rows} let="row" key={row.id}><foreach items={row.cells} let="cell" key={cell.id}><Input bind={cell.name} /></foreach></foreach></Card>',
        {rows},
      );
      fireEvent.change(screen.getAllByRole('textbox')[2], {target: {value: 'Written'}});
      const model = store.getState().dataModel as {rows: typeof rows};
      expect(model.rows[1].cells[0].name).toBe('Written');
    });
  });

  it('names its items <id>@<key>, or <id>@#<n> without key', () => {
    expect(foreachItemIds('Card[0]/foreach[0]', 2, null)).toEqual(['Card[0]/foreach[0]@#0', 'Card[0]/foreach[0]@#1']);
    expect(foreachItemIds('f', 3, ['a', 'b', 'a'])).toEqual(['f@a', 'f@b', 'f@a#1']);
    expect(foreachItemIds('f', 1, [null])).toEqual(['f@#0']);
  });
});

describe('suspense', () => {
  const source =
    '<suspense><fallback><Text>Loading</Text></fallback><error><Text>Could not load: {error.message}</Text></error><Text>{deps.robot.arm.mode}</Text></suspense>';

  it('shows its fallback while a read inside is pending, then the value', () => {
    const {store} = render(source, {deps: {robot: {}}}, {statuses: {'deps.robot.arm': {status: 'pending'}}});
    expect(screen.queryByText('Loading')).not.toBeNull();
    act(() => {
      store.getState().setRuntimeValue('deps.robot.arm', {mode: 'idle'});
      store.getState().setStatus('deps.robot.arm', {status: 'ready'});
    });
    expect(screen.queryByText('Loading')).toBeNull();
    expect(screen.queryByText('idle')).not.toBeNull();
  });

  it('shows its error, with the error bound as error', () => {
    render(source, {}, {statuses: {'deps.robot.arm': {status: 'failed', error: 'robot is gone'}}});
    expect(screen.queryByText('Could not load: robot is gone')).not.toBeNull();
    expect(screen.queryByText('Loading')).toBeNull();
  });

  it('never suspends on stale: the last value renders, marked data-stale', () => {
    render(source, {deps: {robot: {arm: {mode: 'parked'}}}}, {statuses: {'deps.robot.arm': {status: 'stale'}}});
    expect(screen.queryByText('Loading')).toBeNull();
    const shown = screen.getByText('parked');
    expect(shown.hasAttribute('data-stale')).toBe(true);
  });

  it('the nearest boundary catches', () => {
    render(
      '<suspense><fallback><Text>Outer</Text></fallback><Text>{a.x}</Text><suspense><fallback><Text>Inner</Text></fallback><Text>{b.x}</Text></suspense></suspense>',
      {a: {x: 'A'}},
      {statuses: {b: {status: 'pending'}}},
    );
    expect(screen.queryByText('Inner')).not.toBeNull();
    expect(screen.queryByText('Outer')).toBeNull();
  });
});

describe('without a boundary', () => {
  it('a pending node shows its own skeleton and its siblings render', () => {
    render('<Card><Text>{deps.robot.arm.mode}</Text><Text>Beside</Text></Card>', {}, {statuses: {'deps.robot.arm': {status: 'pending'}}});
    expect(document.querySelector('[data-blok-pending]')).not.toBeNull();
    expect(screen.queryByText('Beside')).not.toBeNull();
  });

  it('a failed node shows an inline error', () => {
    render('<Card><Text>{queries.cells.value.count}</Text></Card>', {}, {
      statuses: {'queries.cells.value': {status: 'failed', error: 'no access'}},
    });
    expect(screen.queryByText('no access')).not.toBeNull();
  });

  it('a record field never suspends', () => {
    render('<Card><Text>{queries.cells.status}</Text></Card>', {queries: {cells: {status: 'pending', value: null}}}, {
      statuses: {'queries.cells.value': {status: 'pending'}},
    });
    expect(screen.queryByText('pending')).not.toBeNull();
  });
});

describe('lazy operators', () => {
  it('a ternary reads only the branch taken', () => {
    render('<Text>{flag ? "on" : deps.robot.arm.mode}</Text>', {flag: true}, {statuses: {'deps.robot.arm': {status: 'pending'}}});
    expect(screen.queryByText('on')).not.toBeNull();
  });

  it('&& stops at the first operand that decides it', () => {
    render('<Text when={flag && deps.robot.arm.on}>Shown</Text>', {flag: false}, {statuses: {'deps.robot.arm': {status: 'pending'}}});
    expect(document.querySelector('[data-blok-pending]')).toBeNull();
    expect(screen.queryByText('Shown')).toBeNull();
  });
});

describe('className lists (str.classes)', () => {
  it('drops falsy entries and keeps the true keys of an object', () => {
    render('<Text className={["px-2", task.running && "animate-pulse", task.failed && "text-destructive"]}>Status</Text>', {
      task: {running: true, failed: false},
    });
    const element = screen.getByText('Status');
    expect(element.className).toContain('px-2');
    expect(element.className).toContain('animate-pulse');
    expect(element.className).not.toContain('text-destructive');
  });

  it('keeps the keys of an object whose values are true', () => {
    render('<Text className={{"font-bold": task.done, italic: !task.done}}>Done?</Text>', {task: {done: true}});
    const element = screen.getByText('Done?');
    expect(element.className).toContain('font-bold');
    expect(element.className).not.toContain('italic');
  });
});

describe('then', () => {
  it('is the viewed moment: null live, the travel time while travelling', () => {
    render('<Text>{then ? "past" : "live"}</Text>');
    expect(screen.queryByText('live')).not.toBeNull();
    cleanup();
    render('<Text>{then}</Text>', undefined, {travelAt: '2026-10-25T12:00:00.000Z'});
    expect(screen.queryByText('2026-10-25T12:00:00.000Z')).not.toBeNull();
  });

  it('measures between two moments with pure functions only', () => {
    render('<Text>{fmt.duration(time.diff(args.start, then))}</Text>', {args: {start: '2026-10-25T11:58:30Z'}}, {travelAt: '2026-10-25T12:00:00Z'});
    expect(screen.queryByText('1m 30s')).not.toBeNull();
  });
});
