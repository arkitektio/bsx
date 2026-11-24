import type * as z from 'zod';
import {markedPort} from '../renderer/runtime/schemas';
import {checkShape, ITEM_KEY, portJson, type SpecChildPort, type SpecPort} from '../spec/ports';

/**
 * The port a zod schema publishes as a catalog prop (arkitekt-spec's
 * `CatalogPort`). A marked schema (`markPortSchema`, `markTextSchema`,
 * `markStructureSchema`) is its mark; any other is read by its shape. A shape
 * no port says (`unknown`, `any`, `custom`, ...) throws, naming `where`: every
 * drawn prop is typed.
 */

type ZodDef = {
  type?: string;
  format?: string;
  innerType?: z.ZodTypeAny;
  in?: z.ZodTypeAny;
  out?: z.ZodTypeAny;
  options?: z.ZodTypeAny[];
  values?: unknown[];
  entries?: Record<string, unknown>;
  element?: z.ZodTypeAny;
  valueType?: z.ZodTypeAny;
  items?: z.ZodTypeAny[];
  rest?: z.ZodTypeAny | null;
  shape?: Record<string, z.ZodTypeAny>;
  catchall?: z.ZodTypeAny;
  getter?: () => z.ZodTypeAny;
};

const defOf = (schema: z.ZodTypeAny): ZodDef => (schema as unknown as {def?: ZodDef}).def ?? {};
const formatOf = (schema: z.ZodTypeAny): string | undefined =>
  (schema as unknown as {format?: string | null}).format ?? defOf(schema).format ?? undefined;

const INT_FORMATS = new Set(['safeint', 'int32', 'uint32', 'int64', 'uint64']);
const DATE_FORMATS = new Set(['date', 'datetime']);
const WRAPPERS = new Set(['optional', 'default', 'prefault', 'readonly', 'catch', 'nonoptional']);

const describedAs = (schema: z.ZodTypeAny): string | null => (schema as unknown as {description?: string}).description ?? null;

/** The port of `schema`; throws, naming `where`, on a shape no port says. */
export const zodToPort = (schema: z.ZodTypeAny, where: string): SpecPort => {
  let current = schema;
  let nullable = false;
  const lazies = new Set<object>();
  for (let depth = 0; depth < 64; depth += 1) {
    const marked = markedPort(current);
    if (marked) return nullable ? {...marked, nullable: true} : marked;
    const def = defOf(current);
    if (def.type && WRAPPERS.has(def.type) && def.innerType) current = def.innerType;
    else if (def.type === 'nullable' && def.innerType) {
      nullable = true;
      current = def.innerType;
    } else if (def.type === 'pipe' && def.in && def.out) current = defOf(def.in).type === 'transform' ? def.out : def.in;
    else if (def.type === 'lazy' && def.getter) {
      if (lazies.has(current)) throw new Error(`${where}: a recursive schema has no port; mark it (markPortSchema)`);
      lazies.add(current);
      current = def.getter();
    } else break;
  }
  const port = shapePort(current, where);
  return nullable ? {...port, nullable: true} : port;
};

const child = (key: string, port: SpecPort, description?: string | null): SpecChildPort => ({
  key,
  ...port,
  ...(description ? {description} : {}),
});

const scalarKind = (values: readonly unknown[], where: string): string => {
  if (values.every(value => typeof value === 'string')) return 'STRING';
  if (values.every(value => typeof value === 'boolean')) return 'BOOL';
  if (values.every(value => typeof value === 'number')) return values.every(value => Number.isInteger(value)) ? 'INT' : 'FLOAT';
  throw new Error(`${where}: literals of mixed kinds have no port; use a union`);
};

const shapePort = (schema: z.ZodTypeAny, where: string): SpecPort => {
  const def = defOf(schema);
  switch (def.type) {
    case 'string':
      return {kind: DATE_FORMATS.has(formatOf(schema) ?? '') ? 'DATE' : 'STRING'};
    case 'template_literal':
      return {kind: 'STRING'};
    case 'enum': {
      const values = Object.values(def.entries ?? {});
      return {kind: scalarKind(values, where), choices: values.map(value => ({value}))};
    }
    case 'literal': {
      const values = def.values ?? [];
      return {kind: scalarKind(values, where), choices: values.map(value => ({value}))};
    }
    case 'number':
      return {kind: INT_FORMATS.has(formatOf(schema) ?? '') ? 'INT' : 'FLOAT'};
    case 'nan':
      return {kind: 'FLOAT'};
    case 'bigint':
      return {kind: 'INT'};
    case 'boolean':
      return {kind: 'BOOL'};
    case 'date':
      return {kind: 'DATE'};
    case 'array':
    case 'set':
      return {kind: 'LIST', children: [child(ITEM_KEY, zodToPort((def.element ?? def.valueType) as z.ZodTypeAny, `${where}[]`))]};
    case 'tuple': {
      const items = [...(def.items ?? []), ...(def.rest ? [def.rest] : [])];
      return {kind: 'LIST', children: [child(ITEM_KEY, unionOf(items.map((item, index) => zodToPort(item, `${where}[${index}]`)), where))]};
    }
    case 'record':
    case 'map':
      return {kind: 'DICT', children: [child(ITEM_KEY, zodToPort(def.valueType as z.ZodTypeAny, `${where}{}`))]};
    case 'object': {
      const shape = Object.entries(def.shape ?? {});
      if (!shape.length) {
        const catchall = def.catchall && defOf(def.catchall).type !== 'never' ? def.catchall : null;
        if (!catchall) throw new Error(`${where}: an empty object has no port; say what it holds (z.record)`);
        return {kind: 'DICT', children: [child(ITEM_KEY, zodToPort(catchall, `${where}{}`))]};
      }
      return {
        kind: 'MODEL',
        children: shape.map(([key, field]) => {
          const port = zodToPort(field, `${where}.${key}`);
          return child(key, field.safeParse(undefined).success ? {...port, nullable: true} : port, describedAs(field));
        }),
      };
    }
    case 'union': {
      const isNull = (option: z.ZodTypeAny) => ['null', 'undefined'].includes(defOf(option).type ?? '');
      const options = def.options ?? [];
      const port = unionOf(options.filter(option => !isNull(option)).map((option, index) => zodToPort(option, `${where}|${index}`)), where);
      return options.some(isNull) ? {...port, nullable: true} : port;
    }
    case 'null':
    case 'undefined':
      throw new Error(`${where}: null alone has no port; make a typed schema nullable`);
    default:
      throw new Error(`${where}: a ${def.type ?? 'schema'} has no port; type it (or mark it: markPortSchema)`);
  }
};

const LEAF_CHOICES = new Set(['STRING', 'INT', 'FLOAT', 'BOOL']);

/** Variants as one port: nested unions flattened, the same variant once, literals of one kind merged; one variant is itself. */
export const unionOf = (variants: readonly SpecPort[], where: string): SpecPort => {
  const flat: SpecPort[] = [];
  for (const variant of variants) {
    if (variant.kind === 'UNION') flat.push(...(variant.children ?? []).map(({key: _key, description: _description, ...port}) => port));
    else flat.push(variant);
  }
  const merged: SpecPort[] = [];
  for (const variant of flat) {
    const same = merged.findIndex(other => other.kind === variant.kind && LEAF_CHOICES.has(variant.kind ?? '') && other.choices && variant.choices);
    if (same >= 0 && variant.choices) {
      const other = merged[same];
      const values = new Set((other.choices ?? []).map(choice => choice.value));
      merged[same] = {...other, choices: [...(other.choices ?? []), ...variant.choices.filter(choice => !values.has(choice.value))]};
    } else merged.push(variant);
  }
  const seen = new Set<string>();
  const unique = merged.filter(variant => {
    const text = JSON.stringify(portJson(variant));
    if (seen.has(text)) return false;
    seen.add(text);
    return true;
  });
  // A plain variant takes every literal of its kind: the literals add nothing.
  const kept = unique.filter(variant => !(variant.choices && unique.some(other => other !== variant && other.kind === variant.kind && !other.choices)));
  if (kept.length === 1) return kept[0];
  const port: SpecPort = {kind: 'UNION', children: kept.map((variant, index) => child(String(index), variant))};
  checkShape(port, where);
  return port;
};

/** A hand-written port or a zod schema, as a port. */
export const asPort = (value: SpecPort | z.ZodTypeAny, where: string): SpecPort =>
  typeof value === 'object' && value !== null && '_zod' in value ? zodToPort(value as z.ZodTypeAny, where) : (value as SpecPort);
