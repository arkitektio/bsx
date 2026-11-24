import * as z from 'zod';
import type {BlokCatalogContract} from './catalog';
import type {BlokComponentContext, BlokComponentContract} from './components';
import {isRequiredField} from './preflight';
import {isActionSchema, isBindSchema} from './schemas';
import {asPort, zodToPort} from '../../catalogs/zodToPort';
import {ASSET, BINDING, CALLBACK, ITEM_KEY, portJson, type SpecPort} from '../../spec/ports';

/**
 * A contract in the spec's terms: what a catalog file (`spec/catalogs/base@4.json`,
 * arkitekt-spec's `blok/catalogs/`) says of each component. Written from the
 * contract, never by hand: the zod schemas are the source of a component's
 * props and documentation, the JSON what they say in the spec's terms. The
 * spec's base catalog is built from it (`pnpm spec:export`), and an app
 * catalog is published as it (`blokCatalogSpec`).
 */

export type SpecPropJson = {
  key: string;
  /** The port the prop is typed by (`spec/ports.ts`); never open for a drawn component. */
  port: Record<string, unknown> | null;
  required: boolean;
  description: string | null;
};

export type SpecComponentJson = {
  name: string;
  description: string | null;
  context: 'PANEL' | 'SCENE' | 'LOGO';
  children_context: 'PANEL' | 'SCENE' | 'LOGO' | null;
  inherits_context: boolean;
  accepts_children: boolean;
  downstream_of: string[];
  not_downstream_of: string[];
  text_prop: string | null;
  props: SpecPropJson[];
  kinds?: string[];
  service?: string;
  since?: number;
};

export type SpecCatalogJson = {
  /** The address a published catalog is known by. */
  id?: string;
  name: string;
  version?: number;
  minor?: number;
  /** The id of the catalog it adds to. */
  extends?: string;
  description: string;
  components: SpecComponentJson[];
};

const CONTEXT: Record<BlokComponentContext, SpecComponentJson['context']> = {panel: 'PANEL', scene: 'SCENE', logo: 'LOGO'};

const byKey = <T extends {key: string}>(left: T, right: T) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
const byName = <T extends {name: string}>(left: T, right: T) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0);

/** A prop's port: a callback's payload, a binding's value, an asset, else its schema's. */
export const blokPropPort = (name: string, key: string, schema: z.ZodTypeAny, component: BlokComponentContract): SpecPort => {
  const where = `<${name}> ${key}`;
  if (isActionSchema(schema)) {
    const fields = component.events?.[key] ?? [];
    return {kind: CALLBACK, children: fields.map(field => ({key: field.key, ...asPort(field.port, `${where} event.${field.key}`), description: field.description}))};
  }
  if (isBindSchema(schema)) {
    const writes = component.bindKinds?.[key];
    if (!writes) throw new Error(`${where}: a bind prop says what it writes (bindKinds)`);
    return {kind: BINDING, children: [{key: ITEM_KEY, ...asPort(writes, where)}]};
  }
  if (component.propKinds?.[key] === ASSET) return {kind: ASSET};
  return zodToPort(schema, where);
};

/** `children` is no prop in the spec: `accepts_children` says a component takes them. */
const CHILDREN = 'children';

export const describeBlokComponent = (name: string, component: BlokComponentContract): SpecComponentJson => {
  const shape = component.schema.shape as Record<string, z.ZodTypeAny>;
  const placement = component.placement ?? {};
  const props = Object.entries(shape)
    .filter(([key]) => key !== CHILDREN)
    .map(([key, schema]): SpecPropJson => ({
      key,
      port: portJson(blokPropPort(name, key, schema, component)),
      required: isRequiredField(schema),
      description: schema.description ?? null,
    }))
    .sort(byKey);
  return {
    name,
    description: component.schema.description ?? null,
    context: CONTEXT[placement.context ?? 'panel'],
    children_context: placement.childrenContext ? CONTEXT[placement.childrenContext] : null,
    inherits_context: placement.inheritsContext ?? false,
    accepts_children: component.acceptsChildren ?? CHILDREN in shape,
    downstream_of: [...(placement.downstreamOf ?? [])],
    not_downstream_of: [...(placement.notDownstreamOf ?? [])],
    text_prop: component.textProp ?? null,
    props,
    ...(component.kinds?.length ? {kinds: [...component.kinds]} : {}),
    ...(component.service ? {service: component.service} : {}),
    ...(component.since ? {since: component.since} : {}),
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
