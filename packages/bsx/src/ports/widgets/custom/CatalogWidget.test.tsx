// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  run: vi.fn(async (_query: string, _variables: Record<string, unknown>) => ({ options: [] })),
}));

vi.mock("../../rekuest", () => ({ PortKind: { Structure: "STRUCTURE" } }));
vi.mock("../../host", () => ({
  portHost: () => ({
    useStructureOptions: () => undefined,
    useOptionSourceHonoursRequires: () => false,
    useServiceQuery: () => (query: string, variables: Record<string, unknown>) => service.run(query, variables),
  }),
}));
// The real control is a popover over cmdk; what is under test is the path
// between the form and the component, not the list.
vi.mock("../../forms/StructurePickerControl", () => ({
  StructurePickerControl: (props: {
    value: string | undefined;
    onChange: (value: string | undefined) => void;
    load: (request: { search?: string; limit: number; offset: number }) => Promise<unknown>;
    requires?: unknown[];
  }) => (
    <div data-testid="picker" data-value={props.value ?? ""} data-requires={JSON.stringify(props.requires ?? null)}>
      <button type="button" onClick={() => props.onChange("42")}>pick</button>
      <button type="button" onClick={() => props.onChange(undefined)}>clear</button>
      <button type="button" onClick={() => void props.load({ limit: 25, offset: 0 })}>list</button>
    </div>
  ),
}));
// The whole default catalog drags every module's bloks in; the picker is what
// a structure port hosts.
vi.mock("../../../renderer/catalog", async () => {
  const { createBlokCatalog } = await import("../../../renderer/runtime/index");
  const { hostedStructure } = await import("../../structure");
  const catalog = createBlokCatalog("widget-test-catalog", hostedStructure.components);
  return { appBlokCatalog: () => catalog, useBlokCatalog: () => catalog };
});

import { PortsRootContext } from "../../engine/PortsRootContext";
import type { InputWidgetProps } from "../../engine/types";
import { CatalogWidget } from "./CatalogWidget";

afterEach(cleanup);

const QUERY =
  "query Lenses($search: String, $values: [ID!], $requires: [DescriptorConstraintInput!], $path: ID, $limit: Int, $offset: Int = 0) { options: lenses(filters: {search: $search, ids: $values, requires: $requires, reachableFrom: $path}, pagination: {limit: $limit, offset: $offset}) { value: id label } }";

const VOLUME = [{ __typename: "Requires", key: "@mikro/n_space_axes", operator: "EQUALS", value: 3 }];

const port = {
  key: "lens",
  kind: "STRUCTURE",
  identifier: "@mikro/arraylens",
  label: "Lens",
  description: "The volume the path was drawn on",
  requires: VOLUME,
} as unknown as InputWidgetProps["port"];

const PICKER_PROPS = [
  // As the server spells a prop (camelCase), which the host normalizes.
  { __typename: "ComponentProp", key: "bind", staticValue: "value" },
  { __typename: "ComponentProp", key: "query", staticValue: QUERY },
  { __typename: "ComponentProp", key: "ward", staticValue: "mikro" },
];

const Harness = ({
  onForm,
  component = "StructurePicker",
  portsRoot = [],
  path = ["lens"],
  defaultValues = { lens: undefined, path: undefined },
}: {
  onForm: (form: UseFormReturn) => void;
  component?: string;
  portsRoot?: string[];
  path?: string[];
  defaultValues?: Record<string, unknown>;
}) => {
  const form = useForm({ defaultValues });
  onForm(form);
  return (
    <FormProvider {...form}>
      <PortsRootContext.Provider value={portsRoot}>
        <CatalogWidget
          port={port}
          widget={null as never}
          path={path}
          component={component}
          componentProps={PICKER_PROPS}
          dependencies={["path"]}
          fallback={<span>the plain search</span>}
        />
      </PortsRootContext.Provider>
    </FormProvider>
  );
};

const mount = (props: Partial<Parameters<typeof Harness>[0]> = {}) => {
  let form: UseFormReturn | null = null;
  render(<Harness {...props} onForm={(f) => (form = f)} />);
  return form as unknown as UseFormReturn;
};

const lastVariables = () => service.run.mock.calls.at(-1)?.[1];

describe("a catalog component as a port's input", () => {
  it("draws the port's label and description around the component", () => {
    mount();
    expect(screen.getByText("Lens")).toBeInTheDocument();
    expect(screen.getByText("The volume the path was drawn on")).toBeInTheDocument();
  });

  it("puts what the component writes to `value` on the form field", () => {
    const form = mount();
    fireEvent.click(screen.getByText("pick"));
    expect(form.getValues("lens")).toEqual({ object: "42", __identifier: "@mikro/arraylens" });
    expect(screen.getByTestId("picker").dataset.value).toBe("42");
  });

  it("clears the field to undefined, which is how a form says not given", () => {
    const form = mount({ defaultValues: { lens: { object: "7", __identifier: "@mikro/arraylens" }, path: undefined } });
    expect(screen.getByTestId("picker").dataset.value).toBe("7");
    fireEvent.click(screen.getByText("clear"));
    expect(form.getValues("lens")).toBeUndefined();
    expect(screen.getByTestId("picker").dataset.value).toBe("");
  });

  it("keeps showing what the form holds: a later change of the field is not masked by an earlier pick", () => {
    const form = mount();
    fireEvent.click(screen.getByText("pick"));
    act(() => form.setValue("lens", { object: "9", __identifier: "@mikro/arraylens" }));
    expect(screen.getByTestId("picker").dataset.value).toBe("9");
  });

  it("hands the component the port's own constraints, without the cache's typename", () => {
    service.run.mockClear();
    mount();
    fireEvent.click(screen.getByText("list"));
    expect(lastVariables()).toMatchObject({
      requires: [{ key: "@mikro/n_space_axes", operator: "EQUALS", value: 3 }],
    });
    expect(JSON.parse(screen.getByTestId("picker").dataset.requires!)).toEqual([
      { key: "@mikro/n_space_axes", operator: "EQUALS", value: 3 },
    ]);
  });

  it("puts each dependency under its own name, where the query's variable of that name reads it", () => {
    service.run.mockClear();
    const form = mount();
    fireEvent.click(screen.getByText("list"));
    expect(lastVariables()).toMatchObject({ path: null });

    act(() => form.setValue("path", { object: "a1", __identifier: "@mikro/annotation" }));
    fireEvent.click(screen.getByText("list"));
    expect(lastVariables()).toMatchObject({ path: "a1" });
  });

  it("finds a dependency beside the port when the ports are nested under a prefix", () => {
    service.run.mockClear();
    mount({
      portsRoot: ["args"],
      path: ["args", "lens"],
      defaultValues: { args: { lens: undefined, path: { object: "a1", __identifier: "@mikro/annotation" } } },
    });
    fireEvent.click(screen.getByText("list"));
    expect(lastVariables()).toMatchObject({ path: "a1" });
  });

  it("renders the fallback alone, with no second label, for a component this catalog does not have", () => {
    mount({ component: "LensAtlas" });
    expect(screen.getByText("the plain search")).toBeInTheDocument();
    expect(screen.queryByText("Lens")).toBeNull();
    expect(screen.queryByTestId("picker")).toBeNull();
  });
});

describe("CatalogWidget with a tree", () => {
  const Host = ({ nodes, fallback = "fallback" }: { nodes: unknown[]; fallback?: string }) => {
    const form = useForm({ defaultValues: { lens: "42" } });
    return (
      <FormProvider {...form}>
        <CatalogWidget
          component="StructurePicker"
          componentProps={[
            { key: "bind", staticValue: "value" },
            { key: "query", staticValue: QUERY },
            { key: "ward", staticValue: "mikro" },
          ]}
          nodes={nodes}
          fallback={<span>{fallback}</span>}
          port={port as InputWidgetProps["port"]}
          widget={null as never}
          path={["lens"]}
        />
      </FormProvider>
    );
  };

  it("falls back whole when one node below the root cannot be drawn", () => {
    render(<Host nodes={[{ id: "widget/Missing[0]", component: "NotInThisCatalog" }]} />);
    expect(screen.getByText("fallback")).toBeTruthy();
    expect(screen.queryByTestId("picker")).toBeNull();
  });
});

