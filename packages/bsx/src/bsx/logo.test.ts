import {describe, expect, it} from 'vitest';
import {drawnChildren} from '../renderer/bloks/control';
import {blokLogoTree, content, declaredLogo, LOGO_VIEW_BOX} from './declared';
import {completeBsx} from './language';
import {parseBsx} from './parse';

const PANEL =
  '<Blok kind="agent" context="panel"><logo title="Scope"><Circle cx="12" cy="12" r="7" /><Path d="M12 5v14" /></logo><Card><Text text="hi" /></Card></Blok>';

const props = (node: {props?: Array<{key: string; static_value?: unknown}> | null}) =>
  Object.fromEntries((node.props ?? []).map(prop => [prop.key, prop.static_value]));

describe("a blok's own logo", () => {
  it('draws nothing in the blok', () => {
    const {tree} = parseBsx(PANEL);
    expect(content(tree).map(node => node.component)).toEqual(['Card']);
    expect(drawnChildren(tree).map(node => node.component)).toEqual(['Card']);
    expect(declaredLogo(tree)?.component).toBe('logo');
  });

  it('is drawn as a logo blok of its own, with the action logos pen', () => {
    const logo = blokLogoTree(parseBsx(PANEL).tree);
    expect(logo).not.toBeNull();
    expect(props(logo!)).toEqual({kind: 'agent', context: 'logo'});
    const [drawing] = logo!.children ?? [];
    expect(drawing.component).toBe('Logo');
    expect(props(drawing)).toEqual({viewBox: LOGO_VIEW_BOX, title: 'Scope'});
    const [pen] = drawing.children ?? [];
    expect(pen.component).toBe('G');
    expect(props(pen)).toMatchObject({fill: 'none', stroke: 'ink'});
    expect((pen.children ?? []).map(node => node.component)).toEqual(['Circle', 'Path']);
  });

  it('is none when the blok declares none', () => {
    expect(blokLogoTree(parseBsx('<Blok kind="agent" context="panel"><Card /></Blok>').tree)).toBeNull();
  });

  it('is offered at the top of a blok, and the logo shapes inside it', () => {
    const atRoot = '<Blok kind="agent" context="panel"><|';
    const top = completeBsx(atRoot.replace('|', ''), atRoot.indexOf('|'), {}).map(item => item.label);
    expect(top).toContain('logo');
    const inside = '<Blok kind="agent" context="panel"><logo><|';
    const shapes = completeBsx(inside.replace('|', ''), inside.indexOf('|'), {}).map(item => item.label);
    expect(shapes).toEqual(expect.arrayContaining(['Circle', 'Path']));
    expect(shapes).not.toContain('Card');
  });
});
