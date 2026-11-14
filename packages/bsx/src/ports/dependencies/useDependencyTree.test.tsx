// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import { configurePortHost } from "../host";
import type { ResolvedDependencyInput } from "./tree";
import { useDependencyTree } from "./useDependencyTree";

afterEach(() => {
  cleanup();
  configurePortHost({});
});

const IMPLEMENTATION = { id: "1", dependencies: [{}] };

describe("the dry run of an assign", () => {
  it("keeps the tree of the pins before while a changed pin is asked about", async () => {
    let answerSecond: (data: Record<string, unknown>) => void = () => undefined;
    const query = vi
      .fn()
      .mockResolvedValueOnce({ dependencyTree: { satisfied: false, dependencies: [{ key: "stage", unmet: "Nobody.", mappedAgents: [] }] } })
      .mockImplementationOnce(() => new Promise((resolve) => (answerSecond = resolve)));
    configurePortHost({ useServiceQuery: () => query });

    const { result } = renderHook(() => {
      const form = useForm<{ dependencies: ResolvedDependencyInput[] }>({ defaultValues: { dependencies: [] } });
      return { form, tree: useDependencyTree(IMPLEMENTATION, form.control) };
    });
    await waitFor(() => expect(result.current.tree.satisfied).toBe(false));
    expect(result.current.tree.pending).toBe(false);

    act(() => result.current.form.setValue("dependencies", [{ key: "stage", mappedAgents: [{ key: "stage", agent: "7" }] }]));
    await waitFor(() => expect(query).toHaveBeenCalledTimes(2));
    // Still unmet as far as anyone knows: not "met" for the length of a round trip.
    expect(result.current.tree.satisfied).toBe(false);
    expect(result.current.tree.unmet).toHaveLength(1);
    expect(result.current.tree.pending).toBe(true);

    await act(async () => answerSecond({ dependencyTree: { satisfied: true, dependencies: [{ key: "stage", mappedAgents: [] }] } }));
    expect(result.current.tree.satisfied).toBe(true);
    expect(result.current.tree.pending).toBe(false);
  });

  it("asks nothing for an implementation without dependencies", () => {
    const query = vi.fn();
    configurePortHost({ useServiceQuery: () => query });
    const { result } = renderHook(() => {
      const form = useForm<{ dependencies: ResolvedDependencyInput[] }>({ defaultValues: { dependencies: [] } });
      return useDependencyTree({ id: "1", dependencies: [] }, form.control);
    });
    expect(query).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(false);
    expect(result.current.satisfied).toBeUndefined();
  });
});
