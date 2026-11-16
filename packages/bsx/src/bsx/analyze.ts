import type {BlokComponentNode} from '../renderer/runtime/types';
import {type BlokView} from '../spec/catalogs';
import {diagnosticHint, type BlokFinding} from '../spec/vocabulary';
import {parseBsxSafe, type BsxSourceMap} from './parse';
import {resolveLocals, type ResolvedLocal} from './infer';
import {checkBlokTree, unmountedBlokScope, viewForTree, type BlokCheckScope} from './references';
import type {BsxRange} from './source';

export type BsxMarker = {message: string; range: BsxRange; severity: 'error' | 'warning'; code?: string};

export type BsxAnalysis = {
  /** Null when the text does not parse. */
  tree: BlokComponentNode | null;
  /** Where each node and prop is; empty when the text does not parse. */
  sources: BsxSourceMap;
  /** The validator's findings (none when the text does not parse). */
  findings: BlokFinding[];
  markers: BsxMarker[];
  /** Each `<local>` of the tree with its kind resolved, by node id; null when the text does not parse. */
  resolved: ReadonlyMap<string, ResolvedLocal> | null;
};

/** Where a finding about `nodeId` (and `propKey`) is in the source; `fallback` when the source map has no such node. */
export const rangeForFinding = (sources: BsxSourceMap, nodeId: string | undefined, propKey: string | undefined, fallback: BsxRange): BsxRange => {
  const source = nodeId ? sources.get(nodeId) : undefined;
  if (!source) return fallback;
  const prop = propKey ? source.props.get(propKey) : undefined;
  if (prop) return prop.valueRange.end > prop.valueRange.start ? prop.valueRange : prop.nameRange;
  return source.tagRange;
};

/**
 * Everything the editor marks in a blok's source: where it does not parse
 * (the parser's first refusal, with its code); else every finding of the v2
 * validator (`checkBlokTree`), mounted as `scope` says (unmounted when it
 * says nothing), errors and warnings, each at the node and prop it is about.
 * Without a view, the one of the catalog its `<Blok catalog>` names.
 */
/** A marker's text: the message, then how to fix it on a line of its own. */
const withHint = (message: string, hint: string | null): string => (hint ? `${message}\n${hint}` : message);

export const analyzeBsx = (source: string, options: {scope?: BlokCheckScope | null; view?: BlokView} = {}): BsxAnalysis => {
  const scope = options.scope ?? unmountedBlokScope();
  const parsed = parseBsxSafe(source, options.view);
  if (!parsed.ok) {
    return {
      tree: null,
      sources: new Map(),
      findings: [],
      resolved: null,
      markers: [{message: withHint(parsed.error.message, diagnosticHint(parsed.error.code, parsed.error.fields)), range: parsed.error.range, severity: 'error', code: parsed.error.code}],
    };
  }
  const {tree, sources} = parsed;
  const view = options.view ?? viewForTree(tree);
  const whole = sources.get(tree.id)?.tagRange ?? {start: 0, end: 1};
  const findings = checkBlokTree(tree, scope, view);
  const markers = findings.map(
    (found): BsxMarker => ({
      message: withHint(found.message, found.hint ?? null),
      range: rangeForFinding(sources, found.nodeId, found.propKey, whole),
      severity: found.level,
      code: found.code,
    }),
  );
  return {tree, sources, findings, markers, resolved: resolveLocals(tree, scope.dependencies, view)};
};
