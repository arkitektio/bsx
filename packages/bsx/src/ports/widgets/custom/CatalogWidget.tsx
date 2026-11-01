import {
  BlokComponentHost,
  canHostBlokComponent,
  HOSTED_VALUE_ROOT,
} from "../../../renderer/BlokComponentHost";
import { appBlokCatalog } from "../../../renderer/catalog";
import { portRequires } from "../../engine/constraints";
import { dependencyScope } from "../../engine/portCalls";
import { dependencyFieldName } from "../../engine/portPaths";
import { portDescription, portLabel } from "../../engine/portPresentation";
import { CurrentPortFitsContext, usePortFits } from "../../engine/PortFitsContext";
import { usePortsRoot } from "../../engine/PortsRootContext";
import { type InputWidgetProps } from "../../engine/types";
import { pathToName } from "../../engine/utils";
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../vendor/core/ui/form";
import { type ReactNode, useCallback, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

export type CatalogWidgetProps = InputWidgetProps & {
  /** The catalog component to render as this port's input. */
  component: string;
  /** Its props, as declared. They may read `value` and each dependency by its name. */
  componentProps: readonly unknown[];
  /** The nodes below it, as the server sends them. */
  nodes?: readonly unknown[] | null;
  /** The other ports whose values the props may read. */
  dependencies?: readonly string[] | null;
  /** What to render when this client's catalog cannot render the component as declared. */
  fallback: ReactNode;
};

let unserializableCounter = 0;

/**
 * A catalog component as the input of a port, inside the form.
 *
 * The component reads the port's own value under the root `value` and each
 * declared dependency under its own name, exactly the roots the server lets a
 * widget's props reference. The form stays the owner of the value: what the
 * component writes to `value` is set on the field (a cleared `null` as
 * `undefined`, which is how the form says "not given"), and what the form
 * holds is what the component is shown.
 *
 * Label, description and validation message are the port's and are drawn
 * here, so a catalog component is only ever the control.
 */
export const CatalogWidget = ({
  component,
  componentProps,
  nodes,
  dependencies,
  fallback,
  port,
  widget,
  path,
}: CatalogWidgetProps) => {
  const form = useFormContext();
  const portsRoot = usePortsRoot();
  const name = pathToName(path);
  const rootKey = pathToName([...portsRoot]);
  const dependencyKey = (dependencies ?? []).join("\n");

  const names = useMemo(
    () => [
      name,
      ...(dependencyKey ? dependencyKey.split("\n") : []).map((dependency) =>
        dependencyFieldName(dependency, name.split("."), rootKey ? rootKey.split(".") : []),
      ),
    ],
    [name, dependencyKey, rootKey],
  );
  const watched = useWatch({ control: form.control, name: names }) as unknown[];

  // `watched` is a fresh array every render; the data model must only change
  // when a value does, or every render would reset the component's runtime.
  const watchedKey = useMemo(() => {
    try {
      return JSON.stringify(watched);
    } catch {
      return `unserializable:${++unserializableCounter}`;
    }
  }, [watched]);

  const data = useMemo(() => {
    const [value, ...dependencyValues] = watched;
    return {
      ...dependencyScope(dependencyKey ? dependencyKey.split("\n") : [], dependencyValues),
      // Last: a dependency named `value` cannot shadow the port's own.
      [HOSTED_VALUE_ROOT]: value ?? null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedKey, dependencyKey]);

  const onValue = useCallback(
    (next: unknown) => {
      form.setValue(name, next ?? undefined, { shouldValidate: true, shouldDirty: true });
    },
    [form, name],
  );

  const requiresKey = JSON.stringify(portRequires(port));
  const blokPort = useMemo(
    () => ({ identifier: port.identifier ?? undefined, requires: JSON.parse(requiresKey) }),
    [port.identifier, requiresKey],
  );

  // Decided before the field is drawn: the fallback is a whole widget with a
  // label of its own, and must not be nested under this one's.
  const propsKey = JSON.stringify(componentProps);
  const nodesKey = JSON.stringify(nodes ?? null);
  const hostable = useMemo(
    () =>
      canHostBlokComponent(
        component,
        JSON.parse(propsKey) as unknown[],
        appBlokCatalog(),
        JSON.parse(nodesKey) as unknown[] | null,
      ),
    [component, propsKey, nodesKey],
  );
  if (!hostable) return <>{fallback}</>;

  const portFits = usePortFits(port.key ?? undefined);

  return (
    <FormField
      control={form.control}
      name={name}
      render={() => (
        <FormItem className="flex flex-col">
          <FormLabel>{portLabel(port)}</FormLabel>
          <CurrentPortFitsContext.Provider value={portFits}>
          <BlokComponentHost
            component={component}
            props={componentProps}
            nodes={nodes}
            data={data}
            onValue={onValue}
            port={blokPort}
            fallback={fallback}
            catalog={appBlokCatalog()}
          />
          </CurrentPortFitsContext.Provider>
          {port.description && <FormDescription>{portDescription(port, widget)}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
