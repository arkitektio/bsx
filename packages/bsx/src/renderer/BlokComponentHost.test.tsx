// @vitest-environment jsdom
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {testCatalog} from './bloks/testing';
import {BlokComponentHost} from './BlokComponentHost';

afterEach(cleanup);

/** `<Html><Card><Input bind={value} placeholder="scale" /><p>{limit}</p></Card></Html>`, as the server sends it. */
const NODES = [
  {
    id: 'Html[0]/Card[0]',
    component: 'Card',
    children: [
      {
        id: 'Html[0]/Card[0]/Input[0]',
        component: 'Input',
        props: [
          {key: 'bind', dynamic_value: {path: 'value'}},
          {key: 'placeholder', static_value: 'scale'},
        ],
      },
      {id: 'Html[0]/Card[0]/p[0]', component: 'p', props: [{key: 'text', dynamic_value: {path: 'limit'}}]},
    ],
  },
];

describe('BlokComponentHost with a tree', () => {
  it('draws the nodes over the host data and hands a nested write back to the host', () => {
    const onValue = vi.fn();
    render(
      <BlokComponentHost
        component="Html"
        props={[]}
        nodes={NODES}
        data={{value: 'a', limit: 'up to 9'}}
        onValue={onValue}
        fallback={<span>fallback</span>}
        catalog={testCatalog()}
      />,
    );

    expect(screen.queryByText('fallback')).toBeNull();
    expect(screen.getByText('up to 9')).toBeTruthy();
    const input = screen.getByPlaceholderText('scale') as HTMLInputElement;
    expect(input.value).toBe('a');

    fireEvent.change(input, {target: {value: 'ab'}});
    expect(onValue).toHaveBeenCalledWith('ab');
  });
});
