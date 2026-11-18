import { parseBsxSafe } from "../../../bsx/parse";
import BlokRenderer from "../../../renderer/BlokRenderer";
import { appBlokCatalog } from "../../../renderer/catalog";
import {
  BlokPortPartsProvider,
  type BlokPortOperation,
  type BlokPortParts,
} from "../../../renderer/bloks/port/host";
import { splitPathSegments, useBlokRuntimeStoreApi, type BlokComponentNode } from "../../../renderer/runtime";
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../vendor/core/ui/form";
import { portHost } from "../../host";
import { portDescription, portLabel } from "../../engine/portPresentation";
import { usePortsRoot } from "../../engine/PortsRootContext";
import { type InputWidgetProps } from "../../engine/types";
import { pathToName, recursiveExtract, recursiveSet } from "../../engine/utils";
import { useWidgetRegistry } from "../../engine/WidgetsContext";
import { type AssignWidgetFragment, type BlokAssignWidgetFragment } from "../../rekuest";
import * as React from "react";
import { useController, useFormContext, useWatch } from "react-hook-form";

/** The root a port blok reads its port under, and the field of it a control writes. */
const PORT_ROOT = "port";
const PORT_VALUE = "value";
const ARGS_ROOT = "args";

/** What a host that knows a run's agents is handed to draw a port blok with (`PortHost.PortBlokRenderer`). */
export type PortBlokRendererProps = {
  /** The blok: one `<Blok kind="port">`, as its source parsed. */
  tree: BlokComponentNode;
  /** `port` (the port record) and `args` (the form's other arguments the blok reads). */
  data: Record<string, unknown>;
  /** `port.set(...)`, `port.clear()`, `port.reset()`, `port.touch()`. */
  writePort: (operation: BlokPortOperation, value?: unknown) => unknown;
  /** Hands what the blok wrote to `port.value` over to the form; render it inside the renderer. */
  children: React.ReactNode;
};

/** A port blok drawn with no agents and no service: `deps` are unbound, queries do not run. */
export const DefaultPortBlokRenderer = ({ tree, data, writePort, children }: PortBlokRendererProps) => (
  <BlokRenderer uiComponents={[tree]} initialState={data} catalog={appBlokCatalog()} writePort={writePort} chrome="none" sizing="intrinsic">
    {children}
  </BlokRenderer>
);

/** The `args.<key>` a tree reads, so the form is watched for exactly those fields. */
export const argsRead = (tree: BlokComponentNode): string[] => {
  const keys = new Set<string>();
  const read = (path: unknown) => {
    if (typeof path !== "string") return;
    const [root, key] = path.split(".");
    if (root === ARGS_ROOT && key) keys.add(key);
  };
  const walkArgument = (argument: unknown) => {
    if (argument === null || typeof argument !== "object") return;
    const entry = argument as Record<string, unknown>;
    read(entry.value_path);
    for (const call of [entry.util_call, entry.agent_call]) {
      const nested = (call as { arguments?: unknown[] } | null | undefined)?.arguments;
      if (Array.isArray(nested)) nested.forEach(walkArgument);
    }
    for (const list of [entry.value_list, entry.value_dict]) if (Array.isArray(list)) list.forEach(walkArgument);
  };
  const walk = (node: BlokComponentNode) => {
    for (const prop of node.props ?? []) {
      const entry = prop as unknown as Record<string, unknown>;
      read((entry.dynamic_value as { path?: unknown } | null | undefined)?.path);
      for (const call of [entry.util_call, entry.agent_call]) {
        const nested = (call as { arguments?: unknown[] } | null | undefined)?.arguments;
        if (Array.isArray(nested)) nested.forEach(walkArgument);
      }
    }
    (node.children ?? []).forEach(walk);
  };
  walk(tree);
  return [...keys].sort();
};

/**
 * Inside the renderer: what a control wrote to `port.value` is handed to the form, which owns
 * the value, and taken back out of the blok's runtime (the form's own update is what it shows).
 */
const PortValueHandover = ({ onValue }: { onValue: (next: unknown) => void }) => {
  const store = useBlokRuntimeStoreApi();
  const onValueRef = React.useRef(onValue);
  React.useEffect(() => {
    onValueRef.current = onValue;
  });
  React.useEffect(() => {
    let handingOver = false;
    return store.subscribe(state => {
      if (handingOver) return;
      const written = Object.keys(state.runtimePathValues).filter(path => {
        const [root, field] = splitPathSegments(path);
        return root === PORT_ROOT && field === PORT_VALUE;
      });
      if (written.length === 0) return;
      const port = (state.dataModel as Record<string, unknown> | undefined)?.[PORT_ROOT] as Record<string, unknown> | undefined;
      const next = port?.[PORT_VALUE];
      handingOver = true;
      try {
        written.forEach(path => store.getState().clearRuntimeValue(path));
      } finally {
        handingOver = false;
      }
      onValueRef.current(next);
    });
  }, [store]);
  return null;
};

type PortBlokFieldProps = InputWidgetProps<BlokAssignWidgetFragment> & {
  tree: BlokComponentNode;
  /** The port as the form draws it without its blok: what `<control />` places. */
  control: React.ReactNode;
};

/**
 * A port blok as a field of the form. The form owns everything about the field: its value, whether
 * it was touched or changed, what is wrong with it. The blok is shown that as `port`, writes the
 * value through `bind={port.value}` or `port.set(...)`, and places the form's own label,
 * description and message where it wants them; what it does not place, the form draws around it.
 */
const PortBlokField = ({ port, widget, path, options, tree, control }: PortBlokFieldProps) => {
  const form = useFormContext();
  const portsRoot = usePortsRoot();
  const name = pathToName(path);
  const { field, fieldState } = useController({ control: form.control, name });

  // Only the arguments the blok reads are watched: another field changing redraws nothing here.
  const read = React.useMemo(() => argsRead(tree), [tree]);
  const readKey = read.join("\n");
  const names = React.useMemo(
    () => (readKey ? readKey.split("\n") : []).map(key => pathToName([...portsRoot, key])),
    [readKey, portsRoot],
  );
  const watched = useWatch({ control: form.control, name: names }) as unknown[];

  const editable = options?.disable !== true && field.disabled !== true;
  const value = recursiveExtract(field.value, port);
  const snapshot = JSON.stringify([value, watched, fieldState.error?.message ?? null, fieldState.isTouched, fieldState.isDirty, editable]);
  const data = React.useMemo(
    () => ({
      [ARGS_ROOT]: Object.fromEntries(read.map((key, index) => [key, watched[index] ?? null])),
      [PORT_ROOT]: {
        value: value ?? null,
        key: port.key,
        label: portLabel(port),
        description: port.description ?? null,
        kind: port.kind,
        identifier: port.identifier ?? null,
        nullable: port.nullable === true,
        default: port.default ?? null,
        choices: port.choices ?? [],
        unit: (port as { referenceUnit?: string | null }).referenceUnit ?? null,
        editable,
        error: fieldState.error?.message ?? null,
        invalid: fieldState.invalid,
        touched: fieldState.isTouched,
        dirty: fieldState.isDirty,
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshot, port, readKey],
  );

  const setValue = React.useCallback(
    (next: unknown) => {
      if (!editable) return;
      // A cleared value is "not given", which the form says with undefined.
      field.onChange(next === null || next === undefined ? undefined : recursiveSet(next, port));
    },
    [editable, field, port],
  );
  const writePort = React.useCallback(
    (operation: BlokPortOperation, next?: unknown) => {
      if (operation === "touch") return field.onBlur();
      if (!editable) return undefined;
      if (operation === "reset") return form.resetField(name);
      return setValue(operation === "clear" ? null : next);
    },
    [editable, field, form, name, setValue],
  );

  // What the blok places of the form's own parts it draws; the rest is drawn around it.
  const placed = React.useMemo(() => {
    const names = new Set<string>();
    const walk = (node: BlokComponentNode) => {
      names.add(node.component);
      (node.children ?? []).forEach(walk);
    };
    walk(tree);
    return names;
  }, [tree]);
  const widgetRegistry = useWidgetRegistry().registry;
  const parts = React.useMemo<BlokPortParts>(
    () => ({
      renderLabel: () => <FormLabel>{portLabel(port)}</FormLabel>,
      renderDescription: () => (port.description ? <FormDescription>{portDescription(port, widget)}</FormDescription> : null),
      renderMessage: () => <FormMessage />,
      renderControl: () => control,
      renderField: (key: string) => {
        const child = (port.children ?? []).find(candidate => candidate?.key === key);
        if (!child) return null;
        const Child = widgetRegistry.getInputWidgetForPort(child as typeof port);
        return <Child port={child as typeof port} widget={(child as typeof port).widget as AssignWidgetFragment} path={[...path, key]} options={options} />;
      },
    }),
    [port, widget, control, widgetRegistry, path, options],
  );

  const Renderer = portHost().PortBlokRenderer ?? DefaultPortBlokRenderer;

  return (
    <FormField
      control={form.control}
      name={name}
      render={() => (
        <FormItem className="flex flex-col">
          {!placed.has("label") && <FormLabel>{portLabel(port)}</FormLabel>}
          <BlokPortPartsProvider value={parts}>
            <Renderer tree={tree} data={data} writePort={writePort}>
              <PortValueHandover onValue={setValue} />
            </Renderer>
          </BlokPortPartsProvider>
          {!placed.has("description") && port.description && <FormDescription>{portDescription(port, widget)}</FormDescription>}
          {!placed.has("message") && <FormMessage />}
        </FormItem>
      )}
    />
  );
};

/**
 * A BLOK assign widget: the port's own blok, written in BSX (`<Blok kind="port">`), drawn where
 * the port's control would be.
 *
 * Where it cannot be drawn (its source does not parse here, or is no port blok), the port
 * degrades the way the server intends: through the widget's `fallback` when one is given, else
 * through what the port would get without a widget. Either way the port stays editable.
 */
export const PortBlokWidget = (props: InputWidgetProps<BlokAssignWidgetFragment>) => {
  const { registry } = useWidgetRegistry();
  const fallback = (props.widget?.fallback ?? null) as AssignWidgetFragment | null;

  const { port, Widget } = React.useMemo(() => {
    const port = { ...props.port, widget: fallback } as typeof props.port;
    return { port, Widget: registry.getInputWidgetForPort(port) };
  }, [props.port, fallback, registry]);
  const plain = <Widget {...props} port={port} widget={fallback as AssignWidgetFragment} />;

  const source = props.widget?.source;
  const tree = React.useMemo(() => {
    if (!source) return null;
    const parsed = parseBsxSafe(source);
    if (!parsed.ok) return null;
    const kind = (parsed.tree.props ?? []).find(prop => prop.key === "kind")?.static_value;
    return parsed.tree.component === "Blok" && kind === PORT_ROOT ? parsed.tree : null;
  }, [source]);
  if (tree === null) return plain;

  return <PortBlokField {...props} tree={tree} control={plain} />;
};
