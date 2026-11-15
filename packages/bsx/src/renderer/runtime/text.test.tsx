// @vitest-environment jsdom
import {cleanup, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {parseBsx} from '../../bsx/parse';
import {renderBsx, testCatalog} from '../bloks/testing';
import {baseBlokCatalog} from '../baseCatalog';
import {lowerBlokText} from './text';

afterEach(cleanup);

type Lowered = {component: string; props?: Array<Record<string, unknown>>; children?: Lowered[]};

const lowered = (source: string, catalog = testCatalog()): Lowered => lowerBlokText(parseBsx(source).tree, catalog) as Lowered;

describe('text, as the renderer draws it', () => {
  it('is the text prop of a component that has one', () => {
    const button = lowered('<Button>Go</Button>');
    expect(button.children).toBeUndefined();
    expect(button.props).toEqual([{key: 'label', static_value: 'Go'}]);
    const badge = lowered('<Badge>{task.status}</Badge>');
    expect(badge.props).toEqual([{key: 'text', dynamic_value: {path: 'task.status'}}]);
  });

  it('is a Text among other children, a span inside a plain html element', () => {
    const card = lowered('<Card>Hello <Badge>new</Badge> there</Card>');
    expect(card.children?.map(child => child.component)).toEqual(['Text', 'Badge', 'Text']);
    expect(card.children?.[0].props).toEqual([{key: 'text', static_value: 'Hello '}]);
    expect(card.children?.[1].props).toEqual([{key: 'text', static_value: 'new'}]);
    expect(lowered('<div>plain</div>').children?.map(child => child.component)).toEqual(['span']);
    // A language element is no place of its own: the text takes after what is around it.
    const within = lowered('<div><if when={args.x}>shown</if></div>');
    expect(within.children?.[0].children?.map(child => child.component)).toEqual(['span']);
  });

  it('leaves a component alone that sets the prop itself, and a tree with no text', () => {
    const both = lowered('<Button label="a">b</Button>');
    expect(both.props).toEqual([{key: 'label', static_value: 'a'}]);
    expect(both.children?.map(child => child.component)).toEqual(['Text']);
    const {tree} = parseBsx('<Card><Button label="Go" /></Card>');
    expect(lowerBlokText(tree, testCatalog())).toBe(tree);
  });

  it('passes a tree stored before text was a node through as it is', () => {
    const stored = {
      id: 'Card[0]',
      component: 'Card',
      children: [
        {id: 'Card[0]/#0', component: 'Text', props: [{key: 'text', static_value: 'Hello'}]},
        {id: 'Card[0]/Button[0]', component: 'Button', props: [{key: 'label', static_value: 'Go'}]},
      ],
    };
    expect(lowerBlokText(stored, testCatalog())).toBe(stored);
  });

  it('is the text node itself where the catalog draws nothing else with it', () => {
    const fragment = lowered('<fragment>bare</fragment>', baseBlokCatalog);
    expect(fragment.children?.map(child => child.component)).toEqual(['#text']);
  });

  it('shows on the page, whichever way it was written', () => {
    renderBsx(testCatalog(), '<Card><Button>Go</Button><Text>Arrived</Text>and done<div>in a div</div></Card>');
    expect(screen.getByRole('button').textContent).toBe('Go');
    for (const shown of ['Arrived', 'and done', 'in a div']) expect(screen.queryByText(shown)).not.toBeNull();
  });
});
