import type * as React from 'react';
import type {DescriptorConstraint} from './engine/constraints';
import type {SearchOptions} from './forms/SearchField';

/**
 * What an action's form needs from the app that shows it, given once at start
 * (`configurePortHost`), before anything renders. A function in a form reaches
 * these outside any provider, so this is a module like `configureBlokPlatform`:
 * one app, one host. Each `use…` is a hook, so what it reads may change between
 * renders, but the host itself may not.
 *
 * - `useServiceQuery`: runs a read-only GraphQL query that arrived as data (a
 *   widget's, a blok's) on one service, for a picker. Without one, pickers say
 *   the service is not connected.
 * - `useStructureOptions`, `useOptionSourceHonoursRequires`: the search a module
 *   offers for its structures, used when a port's widget carries no query.
 * - `displayName`: a structure identifier as people call it.
 * - `useDisplayComponent`, `StructureDisplay`, `StructureViewer`: how the app
 *   shows a structure. Without one, its id.
 * - `useReportError`: where a form's failures go. Without one, the console.
 */
export type ServiceQuery = (query: string, variables: Record<string, unknown>) => Promise<Record<string, unknown>>;

export type StructureOption = {value: string; label: string};

/** A search, plus the constraints of the action input it fills (for a source that honours them). */
export type StructureSearch = SearchOptions & {requires?: readonly DescriptorConstraint[]};

export type StructureOptionSource = (search: StructureSearch) => Promise<StructureOption[]>;

export type StructureDisplayProps = {
  identifier: string;
  id: string | null | undefined;
  variant?: 'inline' | 'avatar' | 'chip' | 'card' | 'embed';
  small?: boolean;
  className?: string;
  link?: boolean;
  fallback?: React.ReactNode;
};

export type StructureViewerProps = {
  identifier: string;
  id: string | null | undefined;
  controls?: boolean;
  className?: string;
  fallback?: React.ReactNode;
};

export type StructureWidgetProps = {id: string; small?: boolean; identifier: string};

export type PortHost = {
  useServiceQuery: (service: string | undefined) => ServiceQuery;
  useStructureOptions: (identifier: string) => StructureOptionSource | undefined;
  useOptionSourceHonoursRequires: (identifier: string) => boolean;
  displayName: (identifier: string) => string;
  useDisplayComponent: (identifier: string) => React.ComponentType<StructureWidgetProps>;
  StructureDisplay: React.ComponentType<StructureDisplayProps>;
  StructureViewer: React.ComponentType<StructureViewerProps>;
  useReportError: () => (error: unknown, title?: string) => void;
};

const notConnected: ServiceQuery = async () => {
  throw new Error('This app has no service to ask.');
};

/** What an app that shows no structures of its own draws: the last part of the identifier, and the id. */
const ShownById = ({identifier, id}: {identifier: string; id?: string | null}) => (
  <span className="truncate text-sm">
    {identifier.split('/').pop()} {id}
  </span>
);

const reportToConsole = (error: unknown, title?: string) => console.error(title ?? 'The form failed', error);

const DEFAULT_HOST: PortHost = {
  useServiceQuery: () => notConnected,
  useStructureOptions: () => undefined,
  useOptionSourceHonoursRequires: () => false,
  displayName: identifier => identifier.split('/').pop() ?? identifier,
  useDisplayComponent: () => ShownById,
  StructureDisplay: ({identifier, id, fallback}) => (id ? <ShownById identifier={identifier} id={id} /> : <>{fallback}</>),
  StructureViewer: ({fallback}) => <>{fallback}</>,
  useReportError: () => reportToConsole,
};

let host: PortHost = DEFAULT_HOST;

/** Says what this app gives an action's form; what it leaves out keeps the default. */
export const configurePortHost = (given: Partial<PortHost>): void => {
  host = {...DEFAULT_HOST, ...given};
};

/** The host as configured. */
export const portHost = (): PortHost => host;
