import * as z from 'zod';
import type {BlokCatalogContract} from './catalog';
import type {BlokComponentContext, BlokComponentContract} from './components';
import {isRequiredField} from './preflight';
import {isActionSchema, isBindSchema, unwrapSchema} from './schemas';

/**
 * A contract as the spec publishes it (`spec/catalogs/ui@1.json`, arkitekt-spec's
 * `blok/catalogs/`): the JSON the server and `arkitekt check` validate bloks
 * against. Written from the contract, never by hand: the zod schemas are the
 * source, the JSON what they say in the spec's terms.
 */

export type SpecValueKind = 'STRING' | 'INT' | 'FLOAT' | 'BOOL' | 'DICT' | 'LIST' | 'ANY' | 'CALLBACK' | 'ASSET';

export type SpecPropJson = {
  key: string;
  kind: string;
  required: boolean;
  description: string | null;
  values?: string[];
  event?: Array<{key: string; kind: string; description: string}>;
};

export type SpecComponentJson = {
  name: string;
  description: string | null;
  context: 'HTML' | 'SCENE' | 'LOGO';
  children_context: 'HTML' | 'SCENE' | 'LOGO' | null;
  inherits_context: boolean;
  accepts_children: boolean;
  downstream_of: string[];
  not_downstream_of: string[];
  text_prop: string | null;
  props: SpecPropJson[];
};

export type SpecCatalogJson = {
  name: string;
  version?: number;
  description: string;
  components: SpecComponentJson[];
};

const INT_FORMATS = new Set(['safeint', 'int32', 'uint32', 'int64', 'uint64']);

type ZodDef = {
  type?: string;
  format?: string;
  in?: z.ZodTypeAny;
  options?: z.ZodTypeAny[];
  values?: unknown[];
  entries?: Record<string, unknown>;
};

const defOf = (schema: z.ZodTypeAny): ZodDef => (schema as unknown as {def?: ZodDef}).def ?? {};

/** Through optional/nullable/default wrappers and transforms (`pipe`). */
const unwrapForKind = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  let current = unwrapSchema(schema);
  for (let depth = 0; depth < 8; depth += 1) {
    const def = defOf(current);
    if (def.type !== 'pipe' || !def.in) return current;
    current = unwrapSchema(def.in);
  }
  return current;
};

/** The closed set of strings a `z.enum` prop takes, through its wrappers; null for any other schema. */
export const zodEnumValues = (schema: z.ZodTypeAny): string[] | null => {
  const def = defOf(unwrapForKind(schema));
  if (def.type !== 'enum' || !def.entries) return null;
  const values = Object.values(def.entries);
  return values.every((value): value is string => typeof value === 'string') ? values : null;
};

/** The spec's value kind for a zod schema; a shape it has no word for is `ANY`. */
export const zodToSpecKind = (schema: z.ZodTypeAny): SpecValueKind => {
  // Action props are `z.custom(...)` under a brand: check before the type switch.
  if (isActionSchema(schema)) return 'CALLBACK';
  const def = defOf(unwrapForKind(schema));
  switch (def.type) {
    case 'string':
    case 'enum':
    case 'template_literal':
      return 'STRING';
    case 'literal': {
      const values = def.values ?? [];
      if (values.every(value => typeof value === 'string')) return 'STRING';
      if (values.every(value => typeof value === 'boolean')) return 'BOOL';
      if (values.every(value => typeof value === 'number')) return 'FLOAT';
      return 'ANY';
    }
    case 'number':
      return def.format && INT_FORMATS.has(def.format) ? 'INT' : 'FLOAT';
    case 'boolean':
      return 'BOOL';
    case 'array':
    case 'tuple':
    case 'set':
      return 'LIST';
    case 'object':
    case 'record':
    case 'map':
      return 'DICT';
    case 'union': {
      const kinds = new Set((def.options ?? []).map(zodToSpecKind));
      return kinds.size === 1 ? [...kinds][0] : 'ANY';
    }
    default:
      return 'ANY';
  }
};

const CONTEXT: Record<BlokComponentContext, SpecComponentJson['context']> = {html: 'HTML', scene: 'SCENE', logo: 'LOGO'};

const byKey = <T extends {key: string}>(left: T, right: T) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
const byName = <T extends {name: string}>(left: T, right: T) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0);

/**
 * What a `bind` says it writes, by the kind it writes: the ports whose locals
 * it may name. Appended to a bind prop's description unless it says so itself.
 */
const BIND_WRITES: Readonly<Record<string, string>> = {
  BOOL: 'It writes a BOOL: the local is a BOOL port.',
  FLOAT: 'It writes a FLOAT: the local is a FLOAT, INT or QUANTITY port.',
  STRING: 'It writes a STRING: the local is a STRING, ENUM or DATE port.',
};

const bindDescription = (description: string | null, kind: string): string | null => {
  const writes = BIND_WRITES[kind];
  if (!writes || description?.includes('It writes')) return description;
  return description ? `${description} ${writes}` : writes;
};

/** `children` is no prop in the spec: `accepts_children` says a component takes them. */
const CHILDREN = 'children';

export const describeBlokComponent = (name: string, component: BlokComponentContract): SpecComponentJson => {
  const shape = component.schema.shape as Record<string, z.ZodTypeAny>;
  const placement = component.placement ?? {};
  const props = Object.entries(shape)
    .filter(([key]) => key !== CHILDREN)
    .map(([key, schema]): SpecPropJson => {
      const bindKind = isBindSchema(schema) ? component.bindKinds?.[key] : undefined;
      const kind = component.propKinds?.[key] ?? bindKind ?? zodToSpecKind(schema);
      const description = bindKind ? bindDescription(schema.description ?? null, bindKind) : (schema.description ?? null);
      const prop: SpecPropJson = {key, kind, required: isRequiredField(schema), description};
      const values = kind === 'STRING' ? zodEnumValues(schema) : null;
      if (values) prop.values = values;
      if (kind === 'CALLBACK') prop.event = [...(component.events?.[key] ?? [])];
      return prop;
    })
    .sort(byKey);
  return {
    name,
    description: component.schema.description ?? null,
    context: CONTEXT[placement.context ?? 'html'],
    children_context: placement.childrenContext ? CONTEXT[placement.childrenContext] : null,
    inherits_context: placement.inheritsContext ?? false,
    accepts_children: component.acceptsChildren ?? CHILDREN in shape,
    downstream_of: [...(placement.downstreamOf ?? [])],
    not_downstream_of: [...(placement.notDownstreamOf ?? [])],
    text_prop: component.textProp ?? null,
    props,
  };
};

export const describeBlokContract = (contract: BlokCatalogContract): SpecCatalogJson => ({
  name: contract.name,
  ...(contract.version === null ? {} : {version: contract.version}),
  description: contract.description,
  components: Object.entries(contract.components)
    .map(([name, component]) => describeBlokComponent(name, component))
    .sort(byName),
});

/** The spec's file text: Python's `json.dumps(indent=1)` (ASCII-escaped), so a regenerated file diffs clean. */
export const specJsonText = (value: unknown): string =>
  `${JSON.stringify(value, null, 1).replace(/[\u007f-￿]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)}\n`;
