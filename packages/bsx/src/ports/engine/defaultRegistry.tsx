import { ChoicesWidget } from "../widgets/custom/ChoicesWidget";
import { CustomWidget } from "../widgets/custom/CustomWidget";
import { ProxyWidget } from "../widgets/custom/ProxyWidget";
import { SearchWidget } from "../widgets/custom/SearchWidget";
import { SliderWidget } from "../widgets/custom/SliderWidget";
import { StructurePickerWidget } from "../widgets/custom/StructurePickerWidget";
import { HideEffect } from "../widgets/effects/HideEffect";
import { BoolWidget } from "../widgets/fallbacks/BoolWidget";
import { DateWidget } from "../widgets/fallbacks/DateWidget";
import { DictWidget } from "../widgets/fallbacks/DictWidget";
import { EnumWidget } from "../widgets/fallbacks/EnumWidget";
import { FloatWidget } from "../widgets/fallbacks/FloatWidget";
import { IntWidget } from "../widgets/fallbacks/IntWidget";
import { ListWidget } from "../widgets/fallbacks/ListWidget";
import { ModelWidget } from "../widgets/fallbacks/ModelWidget";
import { QuantityWidget } from "../widgets/fallbacks/QuantityWidget";
import { StringWidget } from "../widgets/fallbacks/StringWidget";
import { StructureWidget } from "../widgets/fallbacks/StructureWidget";
import { UnionWidget } from "../widgets/fallbacks/UnionWidget";
import { DelegatingStructureWidget } from "../widgets/returns/DelegatingStructureWidget";
import { BoolReturnWidget } from "../widgets/returns/fallbacks/BoolReturnWidget";
import { DateReturnWidget } from "../widgets/returns/fallbacks/DateReturnWidget";
import { EnumReturnWidget } from "../widgets/returns/fallbacks/EnumReturnWidget";
import { FloatReturnWidget } from "../widgets/returns/fallbacks/FloatReturnWidget";
import { IntReturnWidget } from "../widgets/returns/fallbacks/IntReturnWidget";
import { ListReturnWidget } from "../widgets/returns/fallbacks/ListReturnWidget";
import { ModelReturnWidget } from "../widgets/returns/fallbacks/ModelReturnWidget";
import { QuantityReturnWidget } from "../widgets/returns/fallbacks/QuantityReturnWidget";
import { StringReturnWidget } from "../widgets/returns/fallbacks/StringReturnWidget";
import { UnionReturnWidget } from "../widgets/returns/fallbacks/UnionReturnWidget";
import { PortKind } from "../rekuest";
import { WidgetRegistry } from "./Registry";
import { UnknownEffectWidget, UnknownInputWidget, UnknownReturnWidget } from "./WidgetsProvider";
import type { ArgPort, EffectWidgetProps, ReturnPort, ReturnWidgetProps, WidgetRegistryType } from "./types";

// HideEffect only knows how to render the "HideEffect" variant of the
// PortEffectFragment union, so narrow to that variant before delegating.
const HideEffectAdapter = ({ effect, port, path, children }: EffectWidgetProps) => {
  if (effect.__typename !== "HideEffect") {
    return null;
  }
  return (
    <HideEffect effect={effect} port={port} path={path}>
      {children}
    </HideEffect>
  );
};

// BoolReturnWidget narrows its value to boolean; the registry hands widgets
// the generic ValueKind, so coerce before delegating.
const BoolReturnWidgetAdapter = (props: ReturnWidgetProps<any>) => {
  return <BoolReturnWidget {...props} value={Boolean(props.value)} />;
};

/**
 * The widgets every app draws an action's ports with. An app adds its own to
 * what this returns (a memory structure, a state choice). `canPick` says whether
 * a port with no widget still gets the picker, because something answers a search
 * for its structure; asked on every lookup, since what answers can change.
 */
export const createWidgetRegistry = (options: { canPick?: (identifier: string) => boolean } = {}): WidgetRegistry => {
  const registry = new WidgetRegistry(UnknownInputWidget, UnknownReturnWidget, UnknownEffectWidget);

  registry.registerInputWidgetFallback(PortKind.Int, IntWidget);
  registry.registerInputWidgetFallback(PortKind.List, ListWidget);
  registry.registerInputWidgetFallback(PortKind.Bool, BoolWidget);
  registry.registerInputWidgetFallback(PortKind.Date, DateWidget);
  registry.registerInputWidgetFallback(PortKind.Enum, EnumWidget);
  registry.registerInputWidgetFallback(PortKind.Union, UnionWidget);
  registry.registerInputWidgetFallback(PortKind.Dict, DictWidget);
  registry.registerInputWidgetFallback(PortKind.Model, ModelWidget);
  registry.registerInputWidgetFallback(PortKind.Float, FloatWidget);
  registry.registerInputWidgetFallback(PortKind.Quantity, QuantityWidget);
  registry.registerInputWidgetFallback(PortKind.String, StringWidget);
  registry.registerInputWidgetFallback(PortKind.Structure, StructureWidget);

  // A structure port's search is drawn by the catalog's picker, the component
  // an app author names in a CUSTOM widget, and so is a port with no widget
  // whose search something answers.
  registry.setStructurePicker({
    widget: StructurePickerWidget,
    canPick: options.canPick ?? (() => false),
  });

  registry.registerEffectWidget("HideEffect", HideEffectAdapter);

  registry.registerInputWidget("SearchAssignWidget", SearchWidget);
  registry.registerInputWidget("SliderAssignWidget", SliderWidget);
  registry.registerInputWidget("ChoiceAssignWidget", ChoicesWidget);
  registry.registerInputWidget("ProxyWidget", ProxyWidget);
  registry.registerInputWidget("StringAssignWidget", StringWidget);
  registry.registerInputWidget("CustomAssignWidget", CustomWidget);

  registry.registerReturnWidgetFallback(PortKind.Int, IntReturnWidget);
  registry.registerReturnWidgetFallback(PortKind.Float, FloatReturnWidget);
  registry.registerReturnWidgetFallback(PortKind.Quantity, QuantityReturnWidget);
  registry.registerReturnWidgetFallback(PortKind.String, StringReturnWidget);
  registry.registerReturnWidgetFallback(PortKind.Model, ModelReturnWidget);
  registry.registerReturnWidgetFallback(PortKind.List, ListReturnWidget);
  registry.registerReturnWidgetFallback(PortKind.Bool, BoolReturnWidgetAdapter);
  registry.registerReturnWidgetFallback(PortKind.Date, DateReturnWidget);
  registry.registerReturnWidgetFallback(PortKind.Enum, EnumReturnWidget);
  registry.registerReturnWidgetFallback(PortKind.Union, UnionReturnWidget);
  registry.registerReturnWidgetFallback(PortKind.Structure, DelegatingStructureWidget);

  return registry;
};

// `WidgetRegistry.getInputWidgetForPort` / `getReturnWidgetForPort` are typed
// against the specific `ArgPort` / `ReturnPort` fragments, while
// `WidgetRegistryType` (consumed by `WidgetRegistryProvider`) works over the
// broader `MappablePort` union. The caller says which side it wants by the
// method it calls, so the port is cast, never refused on its `__typename`:
// nested child ports and fluss ports do not carry the top-level typename, and
// refusing them painted "No widget registered" over kinds that have a widget.
export const asWidgetRegistry = (registry: WidgetRegistry): WidgetRegistryType => ({
  registerWard: (wardKey, ward) => registry.registerWard(wardKey, ward),
  getWard: (wardKey) => registry.getWard(wardKey),
  registerInputWidget: (widgetType, widget) => registry.registerInputWidget(widgetType, widget),
  registerInputWidgetFallback: (portType, widget) => registry.registerInputWidgetFallback(portType, widget),
  registerReturnWidget: (widgetType, widget) => registry.registerReturnWidget(widgetType, widget),
  registerEffectWidget: (effectType, widget) => registry.registerEffectWidget(effectType, widget),
  registerReturnWidgetFallback: (portType, widget) => registry.registerReturnWidgetFallback(portType, widget),
  getReturnWidgetForPort: (port, allowFallback) => registry.getReturnWidgetForPort(port as ReturnPort, allowFallback),
  getInputWidgetForPort: (port, allowFallback) => registry.getInputWidgetForPort(port as ArgPort, allowFallback),
  getEffectWidget: (effectType) => registry.getEffectWidget(effectType),
});
