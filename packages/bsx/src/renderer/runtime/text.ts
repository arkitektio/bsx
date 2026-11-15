import {baseCatalog} from '../../spec/catalogs';
import type {BlokCatalog} from './functions';
import {isRecord} from './utils';

/**
 * Text as a renderer draws it.
 *
 * The parser stores every run of text as a `#text` node under the component
 * it stands in, and knows no catalog. What a component does with its text is
 * said here, by the renderer, which has the catalog:
 *
 * - A component with a `textProp` whose one child is a run of text takes that
 *   text as the prop (`<Button>Go</Button>` is a `Button` with `label="Go"`).
 * - Any other run of text becomes the component text is drawn with in that
 *   place: a `span` inside a plain html element, a `Text` anywhere else.
 *
 * A tree stored before text was a node holds the prop, or the `Text`/`span`,
 * already: it passes through as it is. A renderer on another toolkit (React
 * Native) uses the same pass, so every run of text arrives as a component it
 * can wrap.
 */

/** The node a run of text is stored as (`bsx/parse`'s `TEXT_NODE`). */
export const BLOK_TEXT_NODE = '#text';
/** The prop of a text node that holds its text. */
export const BLOK_TEXT_VALUE = 'value';
/** What a run of text is drawn with among other children, and inside a plain html element. */
const LOOSE_TEXT = 'Text';
const LOOSE_HTML_TEXT = 'span';
/** The prop `Text` and `span` take their text as. */
const LOOSE_TEXT_PROP = 'text';

let groups: Map<string, string | null> | null = null;

/** The family of a base component (`language`, `html`, ...), by name. */
const groupOf = (component: string): string | null | undefined => {
  groups ??= new Map(baseCatalog().components.map(entry => [entry.name, entry.group]));
  return groups.get(component);
};

type RawNode = Record<string, unknown> & {component: string};

const isNode = (value: unknown): value is RawNode => isRecord(value) && !Array.isArray(value) && typeof value.component === 'string';
const isTextNode = (value: unknown): value is RawNode => isNode(value) && value.component === BLOK_TEXT_NODE;

/** The one prop of a text node, under another key; null when the node holds anything else. */
const valueAs = (node: RawNode, key: string): Record<string, unknown> | null => {
  const props = Array.isArray(node.props) ? node.props : [];
  const value = props.length === 1 && isRecord(props[0]) && props[0].key === BLOK_TEXT_VALUE ? props[0] : null;
  return value ? {...value, key} : null;
};

/**
 * `raw` with every run of text made what `catalog` draws it as. Nodes without
 * text among their children are returned as they are (the same object).
 */
export const lowerBlokText = (raw: unknown, catalog: BlokCatalog, looseText: string = LOOSE_TEXT): unknown => {
  if (!isNode(raw)) return raw;
  const group = groupOf(raw.component);
  // The component loose text becomes here, from the nearest ancestor that is no language element.
  const loose = group === 'html' ? LOOSE_HTML_TEXT : group === 'language' ? looseText : LOOSE_TEXT;
  const children = Array.isArray(raw.children) ? raw.children : null;
  if (!children) return raw;
  const texts = children.filter(isTextNode);
  if (texts.length === 0) {
    const lowered = children.map(child => lowerBlokText(child, catalog, loose));
    return lowered.some((child, index) => child !== children[index]) ? {...raw, children: lowered} : raw;
  }
  const props = Array.isArray(raw.props) ? raw.props : [];
  const textProp = catalog.components.get(raw.component)?.textProp;
  if (textProp && children.length === 1 && !props.some(prop => isRecord(prop) && prop.key === textProp)) {
    const value = valueAs(texts[0], textProp);
    if (value) {
      const {children: _children, ...rest} = raw;
      return {...rest, props: [...props, value]};
    }
  }
  const drawnWith = catalog.components.has(loose) ? loose : null;
  return {
    ...raw,
    children: children.map(child => {
      if (!isTextNode(child)) return lowerBlokText(child, catalog, loose);
      const value = drawnWith ? valueAs(child, LOOSE_TEXT_PROP) : null;
      // A catalog without it draws the text node itself (the language's own `#text`).
      return value ? {id: child.id, component: drawnWith, props: [value]} : child;
    }),
  };
};
