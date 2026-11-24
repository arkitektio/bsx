/**
 * The port a catalog types a prop by: arkitekt-spec's `declare/catalogs/ports.py`.
 *
 * An action's port (kind, identifier, nullable, choices, children, ...) plus three kinds only
 * a catalog uses: CALLBACK (its children are the payload), ASSET (a file an app registered)
 * and BINDING (its one child, keyed `...`, is what the control writes). A `kind` of null is
 * open: it takes any value. A child is a port with a `key` and a `description`.
 */

export const CALLBACK = 'CALLBACK';
export const ASSET = 'ASSET';
export const BINDING = 'BINDING';
export const ITEM_KEY = '...';
/** A STRUCTURE identifier that takes any structure. */
export const OPEN_STRUCTURE = '*';

export const PORT_KINDS: readonly string[] = [
  'INT', 'STRING', 'STRUCTURE', 'LIST', 'BOOL', 'DICT', 'FLOAT', 'DATE', 'UNION', 'ENUM', 'MODEL',
  'MEMORY_STRUCTURE', 'INTERFACE', 'QUANTITY', CALLBACK, ASSET, BINDING,
];
export const CATALOG_ONLY_KINDS: ReadonlySet<string> = new Set([CALLBACK, ASSET, BINDING]);

export type SpecChoice = {value: unknown; label?: string | null; description?: string | null};

export type SpecPort = {
  kind: string | null;
  identifier?: string | null;
  nullable?: boolean;
  choices?: readonly SpecChoice[] | null;
  children?: readonly SpecChildPort[];
  default?: unknown;
  reference_unit?: string | null;
  proposed_units?: readonly string[] | null;
  dimension?: string | null;
};

export type SpecChildPort = SpecPort & {key: string; description?: string | null};

export const OPEN_PORT: SpecPort = {kind: null};

const IDENTIFIED: ReadonlySet<string> = new Set(['STRUCTURE', 'MEMORY_STRUCTURE', 'INTERFACE']);
const LEAVES: ReadonlySet<string> = new Set(['INT', 'STRING', 'BOOL', 'FLOAT', 'DATE', 'ENUM', 'QUANTITY', ASSET, ...IDENTIFIED]);

export const isIdentifiedKind = (kind: string | null | undefined): boolean => kind != null && IDENTIFIED.has(kind);
export const childOf = (port: SpecPort, key: string): SpecChildPort | undefined => port.children?.find(child => child.key === key);

type Raw = Record<string, unknown>;
const isRaw = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);
const field = (raw: Raw, snake: string): unknown => {
  const [head, ...rest] = snake.split('_');
  return raw[snake] ?? raw[head + rest.map(part => part[0].toUpperCase() + part.slice(1)).join('')];
};

/** A port as a catalog writes one (snake or camel case); null is open. Throws on a malformed one. */
export const parsePort = (raw: unknown, where: string): SpecPort => {
  if (raw === null || raw === undefined) return OPEN_PORT;
  if (!isRaw(raw)) throw new Error(`${where}: a port is an object`);
  const kind = raw.kind ?? null;
  if (kind !== null && (typeof kind !== 'string' || !PORT_KINDS.includes(kind))) throw new Error(`${where}: unknown port kind ${String(kind)}`);
  const children = (Array.isArray(raw.children) ? raw.children : []).map((child, index): SpecChildPort => {
    if (!isRaw(child) || typeof child.key !== 'string') throw new Error(`${where}.${index}: a child port has a key`);
    const description = typeof child.description === 'string' ? child.description : null;
    return {key: child.key, ...parsePort(child, `${where}.${index}(${child.key})`), ...(description ? {description} : {})};
  });
  const port: SpecPort = {kind: kind as string | null};
  if (typeof raw.identifier === 'string' && raw.identifier) port.identifier = raw.identifier;
  if (raw.nullable === true) port.nullable = true;
  if (Array.isArray(raw.choices)) {
    port.choices = raw.choices.map(choice => {
      if (isRaw(choice)) {
        return {
          value: choice.value,
          ...(typeof choice.label === 'string' ? {label: choice.label} : {}),
          ...(typeof choice.description === 'string' ? {description: choice.description} : {}),
        };
      }
      if (['string', 'number', 'boolean'].includes(typeof choice)) return {value: choice};
      throw new Error(`${where}: a choice is a value or {value, label}`);
    });
  }
  if (children.length) port.children = children;
  if (raw.default !== undefined && raw.default !== null) port.default = raw.default;
  const unit = field(raw, 'reference_unit');
  if (typeof unit === 'string' && unit) port.reference_unit = unit;
  const units = field(raw, 'proposed_units');
  if (Array.isArray(units) && units.length) port.proposed_units = units.map(String);
  if (typeof raw.dimension === 'string' && raw.dimension) port.dimension = raw.dimension;
  checkShape(port, where);
  return port;
};

/** What a kind needs: children, an identifier, choices (`check_shape`). Throws when it lacks one. */
export const checkShape = (port: SpecPort, where: string): void => {
  const {kind} = port;
  const children = port.children ?? [];
  const count = children.length;
  if (kind === null) return;
  if (LEAVES.has(kind) && count) throw new Error(`${where}: a ${kind} port has no children`);
  if (IDENTIFIED.has(kind) && !port.identifier) throw new Error(`${where}: a ${kind} port names its identifier`);
  if (kind === 'ENUM' && !port.choices?.length) throw new Error(`${where}: an ENUM port lists its choices`);
  if (kind === 'LIST' && count !== 1) throw new Error(`${where}: a LIST port has exactly one child, its item`);
  if ((kind === 'DICT' || kind === 'MODEL') && count === 0) throw new Error(`${where}: a ${kind} port has children`);
  if (kind === 'UNION' && count < 2) throw new Error(`${where}: a UNION port has at least two variants`);
  if (kind === BINDING && (count !== 1 || children[0].key !== ITEM_KEY)) {
    throw new Error(`${where}: a BINDING port has one child, keyed '...': the value it writes`);
  }
  const keys = children.map(child => child.key);
  if (kind !== 'UNION' && new Set(keys).size !== keys.length) throw new Error(`${where}: child keys repeat`);
};

/** The port as a catalog writes it (`port_json`): null for an open root, fields left out when empty. */
export const portJson = (port: SpecPort): Record<string, unknown> | null =>
  port.kind === null && !port.children?.length ? null : portFields(port);

const portFields = (port: SpecPort): Record<string, unknown> => {
  const out: Record<string, unknown> = {kind: port.kind};
  if (port.identifier) out.identifier = port.identifier;
  if (port.nullable) out.nullable = true;
  if (port.choices) {
    out.choices = port.choices.map(choice => ({
      value: choice.value,
      ...(choice.label != null ? {label: choice.label} : {}),
      ...(choice.description != null ? {description: choice.description} : {}),
    }));
  }
  if (port.children?.length) {
    out.children = port.children.map(child => ({key: child.key, ...portFields(child), ...(child.description ? {description: child.description} : {})}));
  }
  if (port.default !== undefined && port.default !== null) out.default = port.default;
  if (port.reference_unit) out.reference_unit = port.reference_unit;
  if (port.proposed_units?.length) out.proposed_units = [...port.proposed_units];
  if (port.dimension) out.dimension = port.dimension;
  return out;
};

/** Whether the port, or any port below it, is open. */
export const hasOpenNode = (port: SpecPort): boolean => port.kind === null || (port.children ?? []).some(hasOpenNode);

/** A value as Python's `repr` writes it. */
export const pythonRepr = (value: unknown): string => {
  if (typeof value === 'string') return `'${value}'`;
  if (value === null || value === undefined) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  return JSON.stringify(value);
};

/** The port as one line (`summary`): `LIST<STRING>`, `STRING | INT`, `CALLBACK(value: BOOL)`. */
export const portSummary = (port: SpecPort): string => {
  const kind = port.kind ?? 'ANY';
  const nullable = port.nullable ? '?' : '';
  const children = port.children ?? [];
  if (port.choices?.length && ['STRING', 'INT', 'FLOAT', 'ENUM'].includes(kind)) return port.choices.map(choice => pythonRepr(choice.value)).join(' | ') + nullable;
  if (IDENTIFIED.has(kind)) return `${kind}(${port.identifier})${nullable}`;
  if (kind === 'UNION') return children.map(portSummary).join(' | ') + nullable;
  if (kind === 'LIST' || kind === BINDING) return `${kind}<${children[0] ? portSummary(children[0]) : 'ANY'}>${nullable}`;
  if (kind === 'DICT' || kind === 'MODEL' || kind === CALLBACK) {
    const inner = children.map(child => (child.key === ITEM_KEY ? portSummary(child) : `${child.key}: ${portSummary(child)}`)).join(', ');
    const angled = kind === 'DICT' && children[0]?.key === ITEM_KEY;
    return `${kind}${angled ? '<' : '('}${inner}${angled ? '>' : ')'}${nullable}`;
  }
  return kind + nullable;
};

/** What a BINDING writes: its one child; any other port is itself. */
export const bindingWrites = (port: SpecPort): SpecPort => (port.kind === BINDING && port.children?.length ? port.children[0] : port);

/** The text a prop shows: `UNION(STRING, INT, FLOAT, BOOL)`. */
export const TEXT_PORT: SpecPort = {
  kind: 'UNION',
  children: ['STRING', 'INT', 'FLOAT', 'BOOL'].map((kind, index) => ({key: String(index), kind})),
};
