import {childOf, isIdentifiedKind, ITEM_KEY, OPEN_PORT, OPEN_STRUCTURE, pythonRepr, type SpecChoice, type SpecPort} from './ports';

/**
 * Whether a value of one port fits a prop typed by another: arkitekt-spec's
 * `declare/catalogs/fit.py`, held to the corpus' `fits` cases.
 *
 * `ok` it fits; `open` nothing can be said (an open side), never a finding;
 * `mismatch` both are concrete and do not overlap.
 */

export type FitStatus = 'ok' | 'open' | 'mismatch';
export type Fit = {status: FitStatus; reason?: string};

const OK: Fit = {status: 'ok'};
const OPEN: Fit = {status: 'open'};
const mismatch = (reason: string): Fit => ({status: 'mismatch', reason});

export const fitOk = (fit: Fit): boolean => fit.status !== 'mismatch';

const WIDENS: Readonly<Record<string, readonly string[]>> = {
  FLOAT: ['INT', 'QUANTITY'],
  STRING: ['ENUM', 'DATE'],
  DICT: ['MODEL'],
};

const name = (port: SpecPort): string => (isIdentifiedKind(port.kind) ? `${port.kind}(${port.identifier})` : (port.kind ?? 'ANY'));

const join = (fits: readonly Fit[]): Fit => fits.find(fit => fit.status === 'mismatch') ?? (fits.some(fit => fit.status === 'open') ? OPEN : OK);

const within = (fit: Fit, where: string): Fit => (fit.status === 'mismatch' ? mismatch(`${where}: ${fit.reason}`) : fit);

const choicesFit = (source: readonly SpecChoice[] | null | undefined, target: readonly SpecChoice[] | null | undefined): Fit => {
  if (!target || !source) return OK;
  const allowed = target.map(choice => choice.value);
  const stray = source.map(choice => choice.value).filter(value => !allowed.includes(value));
  if (!stray.length) return OK;
  const sorted = [...new Set(allowed)].sort((a, b) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0));
  return mismatch(`${stray.map(pythonRepr).join(', ')} not among ${sorted.map(pythonRepr).join(', ')}`);
};

/** Whether a value of `source` fits where `target` is taken. */
export const fits = (source: SpecPort, target: SpecPort): Fit => {
  if (source.kind === null || target.kind === null) return OPEN;
  if (target.kind === 'UNION') {
    const results = (target.children ?? []).map(child => fits(source, child));
    if (results.some(result => result.status === 'ok')) return OK;
    if (results.some(result => result.status === 'open')) return OPEN;
    return mismatch(`${name(source)} is none of ${(target.children ?? []).map(name).join(', ')}`);
  }
  if (source.kind === 'UNION') return join((source.children ?? []).map(child => fits(child, target)));

  const kind = source.kind;
  const wanted = target.kind;
  if (kind === 'STRUCTURE' && wanted === 'DICT') return OPEN;
  if (kind !== wanted) {
    if ((WIDENS[wanted] ?? []).includes(kind)) return choicesFit(source.choices, target.choices);
    return mismatch(`a ${name(source)} is not a ${name(target)}`);
  }
  if (isIdentifiedKind(kind)) {
    if (source.identifier === OPEN_STRUCTURE || target.identifier === OPEN_STRUCTURE || source.identifier === target.identifier) return OK;
    return mismatch(`a ${name(source)} is not a ${name(target)}`);
  }
  if (kind === 'LIST') return within(fits(source.children?.[0] ?? OPEN_PORT, target.children?.[0] ?? OPEN_PORT), 'an item');
  if (kind === 'DICT') return dictFits(source, target);
  if (kind === 'MODEL') return fieldsFit(source, target);
  return choicesFit(source.choices, target.choices);
};

const dictFits = (source: SpecPort, target: SpecPort): Fit => {
  const item = childOf(target, ITEM_KEY);
  if (item) return join((source.children ?? []).map(child => within(fits(child, item), child.key)));
  return fieldsFit(source, target);
};

const fieldsFit = (source: SpecPort, target: SpecPort): Fit => {
  const results: Fit[] = [];
  for (const field of target.children ?? []) {
    const given = childOf(source, field.key) ?? childOf(source, ITEM_KEY);
    if (!given) {
      if (!field.nullable) results.push(mismatch(`no field ${pythonRepr(field.key)}`));
      continue;
    }
    results.push(within(fits(given, field), field.key));
  }
  return join(results);
};

/** Whether a local takes what a control writes (a BINDING's child), by the vocabulary's `bind_kinds`. */
export const bindingFits = (local: SpecPort, writes: SpecPort, bindKinds: Readonly<Record<string, readonly string[]>>): Fit => {
  if (local.kind === null || writes.kind === null) return OPEN;
  if (writes.kind === 'UNION') {
    // The control writes one of them, by how it is set (a ToggleGroup's `multiple`).
    const results = (writes.children ?? []).map(child => bindingFits(local, child, bindKinds));
    if (results.some(result => result.status === 'ok')) return OK;
    if (results.some(result => result.status === 'open')) return OPEN;
    return mismatch(`a ${name(writes)} control writes none a ${name(local)} local takes`);
  }
  const allowed = bindKinds[writes.kind];
  if (!allowed) return fits(writes, local);
  if (!allowed.includes(local.kind)) {
    return mismatch(`a ${name(writes)} control writes a ${[...allowed].sort().join(', ')} local, not a ${name(local)}`);
  }
  if (local.kind === writes.kind && ['LIST', 'DICT', 'MODEL'].includes(local.kind)) return fits(writes, local);
  return OK;
};

/** The port of a literal: its kind, and itself as its one choice. A list or an object is open. */
export const literalPort = (value: unknown): SpecPort => {
  if (value === null || value === undefined) return {kind: null, nullable: true};
  if (typeof value === 'boolean') return {kind: 'BOOL', choices: [{value}]};
  if (typeof value === 'number') return {kind: Number.isInteger(value) ? 'INT' : 'FLOAT', choices: [{value}]};
  if (typeof value === 'string') return {kind: 'STRING', choices: [{value}]};
  return OPEN_PORT;
};
