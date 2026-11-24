import {z} from 'zod';
import {TEXT_PORT, type SpecPort} from '../../spec/ports';
import type {
  BlokActionArgument,
  BlokAgentCall,
  BlokComponentNode,
  BlokComponentProp,
  BlokDynamicValue,
  BlokUtilCall,
} from './types';

const dynamicValueInputSchema: z.ZodType<BlokDynamicValue> = z.object({
  literal: z.string().nullish(),
  path: z.string().nullish(),
});

const actionArgumentInputSchema: z.ZodType<BlokActionArgument> = z.lazy(() =>
  z.object({
    key: z.string().nullish(),
    value_literal: z.unknown().optional(),
    value_path: z.string().nullish(),
    agent_call: agentCallInputSchema.nullish(),
    util_call: utilCallInputSchema.nullish(),
    value_list: z.array(actionArgumentInputSchema).nullish(),
    value_dict: z.array(actionArgumentInputSchema).nullish(),
  }),
);

const agentCallInputSchema: z.ZodType<BlokAgentCall> = z.object({
  dependency: z.string(),
  operation: z.string(),
  arguments: z.array(actionArgumentInputSchema).nullish(),
  given: z.string().nullish(),
});

const utilCallInputSchema: z.ZodType<BlokUtilCall> = z.object({
  operation: z.string(),
  arguments: z.array(actionArgumentInputSchema).nullish(),
});

const componentPropInputSchema: z.ZodType<BlokComponentProp> = z.object({
  key: z.string(),
  static_value: z.unknown().optional(),
  dynamic_value: dynamicValueInputSchema.nullish(),
  agent_call: agentCallInputSchema.nullish(),
  util_call: utilCallInputSchema.nullish(),
  declares_value: z.string().nullish(),
});

const componentNodeInputSchema: z.ZodType<BlokComponentNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    component: z.string(),
    props: z.array(componentPropInputSchema).nullish(),
    children: z.array(componentNodeInputSchema).nullish(),
  }),
);

/*
 * Action props are identified by an explicit brand, never by "does this schema
 * happen to accept a function?". The old structural probe silently reclassified
 * any permissive prop schema (`z.unknown()`, `z.any()`) as an action, which
 * meant an author could turn a value prop into a click handler by accident.
 */
const actionSchemaRegistry = new WeakSet<object>();

export const markActionSchema = <TSchema extends z.ZodTypeAny>(schema: TSchema): TSchema => {
  actionSchemaRegistry.add(schema);
  return schema;
};

/** Strips `.optional()` / `.nullable()` / `.default()` wrappers to reach the brand. */
export const unwrapSchema = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  let current: z.ZodTypeAny = schema;

  for (let depth = 0; depth < 8; depth += 1) {
    const inner = (current as unknown as {def?: {innerType?: z.ZodTypeAny}}).def?.innerType;
    if (!inner) {
      return current;
    }

    current = inner;
  }

  return current;
};

export const isActionSchema = (schema: z.ZodTypeAny | undefined): boolean => {
  if (!schema) {
    return false;
  }

  return actionSchemaRegistry.has(unwrapSchema(schema));
};

/** `bind` props resolve to the path they name, never to what it holds. */
const bindSchemaRegistry = new WeakSet<object>();

export const markBindSchema = <TSchema extends z.ZodTypeAny>(schema: TSchema): TSchema => {
  bindSchemaRegistry.add(schema);
  bindSchemaRegistry.add(unwrapSchema(schema));
  return schema;
};

export const isBindSchema = (schema: z.ZodTypeAny | undefined): boolean =>
  schema !== undefined && (bindSchemaRegistry.has(schema) || bindSchemaRegistry.has(unwrapSchema(schema)));

/**
 * What a schema publishes as its port where its zod shape says less (a pipe, a
 * reference object). Keyed by the schema object; looked up at every unwrap
 * step, since `.describe()` clones only the outer wrapper.
 */
const portSchemaRegistry = new WeakMap<object, SpecPort>();

/** Publish `schema` as `port` (a recursive or opaque shape the converter cannot read). */
export const markPortSchema = <TSchema extends z.ZodTypeAny>(schema: TSchema, port: SpecPort): TSchema => {
  portSchemaRegistry.set(schema, port);
  return schema;
};

/** Publish `schema` as a STRUCTURE of `identifier` (`*`: any). */
export const markStructureSchema = <TSchema extends z.ZodTypeAny>(schema: TSchema, identifier: string): TSchema =>
  markPortSchema(schema, {kind: 'STRUCTURE', identifier});

/** Publish `schema` as text: `UNION(STRING, INT, FLOAT, BOOL)`. */
export const markTextSchema = <TSchema extends z.ZodTypeAny>(schema: TSchema): TSchema => markPortSchema(schema, TEXT_PORT);

export const markedPort = (schema: z.ZodTypeAny): SpecPort | undefined => portSchemaRegistry.get(schema);

const actionValueSchema = markActionSchema(
  z.custom<() => void>(value => typeof value === 'function', {
    message: 'Expected action handler',
  }),
);

const dynamicTextSchema = markTextSchema(
  z.union([z.string(), z.number(), z.boolean()]).transform(value => String(value)),
);

/**
 * Client-side contract for `checks` — a declarative guard list that disables an
 * interactive blok until every entry passes. Each check is either a bare
 * boolean, a data-model path (truthy test), or an explicit
 * `{path | util_call, operator, value}` predicate.
 */
const CHECK_OPERATORS = ['truthy', 'falsy', 'equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'nonEmpty'] as const;

const checkOperatorSchema = z.enum(CHECK_OPERATORS);

/** A check as an author writes one; a `util_call` inside a literal is the renderer's, not published. */
const CHECK_PORT: SpecPort = {
  kind: 'UNION',
  children: [
    {key: '0', kind: 'BOOL'},
    {key: '1', kind: 'STRING'},
    {
      key: '2',
      kind: 'MODEL',
      children: [
        {key: 'path', kind: 'STRING', nullable: true},
        {key: 'operator', kind: 'STRING', nullable: true, choices: CHECK_OPERATORS.map(value => ({value}))},
        {key: 'value', ...TEXT_PORT, nullable: true},
        {key: 'message', kind: 'STRING', nullable: true},
      ],
    },
  ],
};

const checkDescriptorSchema = markPortSchema(z.union([
  z.boolean(),
  z.string(),
  z.object({
    path: z.string().optional(),
    util_call: utilCallInputSchema.nullish(),
    operator: checkOperatorSchema.optional(),
    value: z.unknown().optional(),
    message: z.string().optional(),
  }),
]), CHECK_PORT);

export type BlokCheckDescriptor = z.infer<typeof checkDescriptorSchema>;
export type BlokCheckOperator = z.infer<typeof checkOperatorSchema>;

export const BlokSchemas = {
  DynamicValue: dynamicValueInputSchema,
  ActionArgument: actionArgumentInputSchema,
  AgentCall: agentCallInputSchema,
  UtilCall: utilCallInputSchema,
  ComponentProp: componentPropInputSchema,
  ComponentProps: z.array(componentPropInputSchema).nullish(),
  ComponentNode: componentNodeInputSchema,
  CheckDescriptor: checkDescriptorSchema,
};

export const BlokPropSchemas = {
  ComponentId: z.string(),
  ChildList: z
    .array(
      z.union([
        z.string(),
        z.object({
          id: z.string(),
          basePath: z.string().optional(),
        }),
      ]),
    )
    .optional(),
  DynamicString: dynamicTextSchema,
  DynamicBoolean: z.boolean(),
  Action: actionValueSchema,
  Checks: z.array(checkDescriptorSchema).optional(),
  /** @deprecated use `Checks` — kept so existing catalogs keep compiling. */
  Checkable: z.object({
    checks: z.array(checkDescriptorSchema).optional(),
  }),
};
