// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";

// A popover over cmdk needs a layout engine; what is under test is what the
// rows say and write into the form, so both are flattened to what they contain.
vi.mock("../../vendor/core/ui/popover", () => ({
  Popover: ({ children, open, onOpenChange }: { children: ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) => (
    <div data-open={open}>
      <button type="button" onClick={() => onOpenChange(!open)}>toggle list</button>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div data-testid="list">{children}</div>,
}));
vi.mock("../../vendor/core/ui/command", () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandSeparator: () => null,
  CommandInput: (props: { value: string; onValueChange: (value: string) => void }) => (
    <input aria-label="search" value={props.value} onChange={(event) => props.onValueChange(event.target.value)} />
  ),
  CommandItem: ({ children, onSelect, disabled, ...rest }: { children: ReactNode; onSelect: () => void; disabled?: boolean; "data-checked"?: boolean }) => (
    <button type="button" data-testid="row" data-checked={rest["data-checked"]} disabled={disabled} onClick={onSelect}>
      {children}
    </button>
  ),
}));

import { configurePortHost } from "../host";
import type { ListDependencyFragment } from "../rekuest";
import { DependenciesContainer } from "./DependenciesContainer";
import type { DependencyAgent, DependencyNode, ResolvedDependencyInput } from "./tree";

afterEach(() => {
  cleanup();
  configurePortHost({});
});

const agent = (id: string, name: string, connected = true): DependencyAgent => ({
  id,
  name,
  connected,
  app: { identifier: "live.mikro" },
  release: { version: "1.2" },
  user: { sub: "1" },
});

const declared = (key: string, over: Partial<ListDependencyFragment> = {}): ListDependencyFragment => ({
  id: key,
  key,
  autoResolvable: true,
  optional: false,
  singular: true,
  ...over,
});

const resolvedTo = (key: string, bound: DependencyAgent, below: DependencyNode[] = []): DependencyNode => ({
  key,
  mappedAgents: [{ agentId: bound.id, agent: bound, mappedImplementations: [{ key, resolvedDependencies: below }] }],
});

/** The container in a form, and a way to read what it wrote. */
const mount = (
  dependencies: ListDependencyFragment[],
  extra: { tree?: DependencyNode[]; pins?: ResolvedDependencyInput[]; agents?: DependencyAgent[] } = {},
) => {
  const query = vi.fn(async () => ({ agents: extra.agents ?? [] }));
  configurePortHost({ useServiceQuery: () => query });
  let read: () => ResolvedDependencyInput[] = () => [];
  const Harness = () => {
    const form = useForm({ defaultValues: { dependencies: extra.pins ?? [] } });
    read = () => form.getValues("dependencies");
    return (
      <FormProvider {...form}>
        <DependenciesContainer dependencies={dependencies} bound="1" tree={extra.tree} />
      </FormProvider>
    );
  };
  render(<Harness />);
  return { query, pins: () => read() };
};

describe("the dependencies of a run", () => {
  it("are one line while they resolve by themselves, and ask for no agents", () => {
    const { query, pins } = mount([declared("storage"), declared("segmenter")], {
      tree: [resolvedTo("storage", agent("7", "lab-nas")), resolvedTo("segmenter", agent("8", "gpu-box"))],
    });

    expect(screen.getByText("Runs with")).toBeInTheDocument();
    expect(screen.getByText("lab-nas")).toBeInTheDocument();
    expect(screen.getByText("gpu-box")).toBeInTheDocument();
    expect(screen.queryByText("storage")).not.toBeInTheDocument();
    expect(query).not.toHaveBeenCalled();
    // Seeded: each resolves by itself until someone is named.
    expect(pins()).toEqual([
      { key: "storage", autoResolve: true, mappedAgents: [] },
      { key: "segmenter", autoResolve: true, mappedAgents: [] },
    ]);
  });

  it("open by themselves when one waits to be picked", () => {
    mount([declared("stage", { autoResolvable: false })]);
    expect(screen.getByText("stage")).toBeInTheDocument();
    expect(screen.getByText("Pick an agent…")).toBeInTheDocument();
  });

  it("open on what is unmet, and say why at its row", () => {
    mount([declared("stage")], { tree: [{ key: "stage", unmet: "No connected agent provides this.", mappedAgents: [] }] });
    expect(screen.getByText("stage")).toBeInTheDocument();
    expect(screen.getByText("No connected agent provides this.")).toBeInTheDocument();
  });

  it("count what is unmet once folded again", () => {
    mount([declared("stage")], { tree: [{ key: "stage", unmet: "No connected agent provides this.", mappedAgents: [] }] });
    fireEvent.click(screen.getByText("Runs with"));
    expect(screen.getByText("1 not met")).toBeInTheDocument();
  });

  it("pin the agent picked, and go back to automatic when it is unpicked", async () => {
    const nas = agent("7", "lab-nas");
    const { query, pins } = mount([declared("storage")], { agents: [nas, agent("9", "cold-nas", false)] });
    fireEvent.click(screen.getByText("Runs with"));
    // In the closed field, and as the list's first entry (the mock shows the list always).
    expect(screen.getAllByText("Automatic")).toHaveLength(2);

    fireEvent.click(screen.getByText("toggle list"));
    expect(query).toHaveBeenCalledWith(expect.any(String), { search: "", dependency: "storage" });
    fireEvent.click(await screen.findByText("cold-nas"));
    expect(pins()).toEqual([{ key: "storage", autoResolve: false, mappedAgents: [{ agent: "9", key: "storage" }] }]);

    fireEvent.click(screen.getByText("toggle list"));
    fireEvent.click((await screen.findAllByText("cold-nas")).at(-1)!);
    expect(pins()).toEqual([{ key: "storage", autoResolve: true, mappedAgents: [] }]);
  });

  it("take no more agents than the dependency allows", async () => {
    mount([declared("workers", { singular: false, autoResolvable: false, maxViableInstances: 2 })], {
      agents: [agent("1", "one"), agent("2", "two"), agent("3", "three")],
      pins: [{ key: "workers", mappedAgents: [{ key: "workers", agent: "1" }, { key: "workers", agent: "2" }] }],
    });
    fireEvent.click(screen.getByText("toggle list"));
    const third = (await screen.findByText("three")).closest("button")!;
    expect(third).toBeDisabled();
  });

  it("offer none for an optional dependency, which drops its pin", async () => {
    const { pins } = mount([declared("notifier", { optional: true })]);
    fireEvent.click(screen.getByText("Runs with"));
    fireEvent.click(screen.getByText("toggle list"));
    await act(async () => {});
    fireEvent.click(screen.getAllByText("None").at(-1)!);
    expect(pins()).toEqual([]);
  });

  it("fold what a bound agent needs itself, until something there is unmet", () => {
    const nas = agent("7", "lab-nas");
    mount([declared("storage", { autoResolvable: false })], {
      tree: [resolvedTo("storage", nas, [resolvedTo("database", agent("8", "pg"))])],
    });
    expect(screen.getByText("lab-nas needs database")).toBeInTheDocument();
    expect(screen.queryByText("pg")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("lab-nas needs database"));
    expect(screen.getByText("pg")).toBeInTheDocument();

    cleanup();
    mount([declared("storage", { autoResolvable: false })], {
      tree: [resolvedTo("storage", nas, [{ key: "database", unmet: "Nobody runs a database.", mappedAgents: [] }])],
    });
    expect(screen.getByText("Nobody runs a database.")).toBeInTheDocument();
  });
});
