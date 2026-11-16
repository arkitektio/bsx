// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortKind } from "../rekuest";
import type { PortablePort } from "./types";
import { useAssignForm, type AssignValues } from "./useAssignForm";

const ports = [{ key: "slides", kind: PortKind.String, nullable: false }] as unknown as PortablePort[];

/** Submits with nothing registering `slides`: as when the popover that holds its field is closed. */
const submitted = async (placed?: string[]): Promise<AssignValues | undefined> => {
  const { result } = renderHook(() => useAssignForm({ ports, placed }));
  act(() => result.current.setValue("args.slides", "slide A"));
  let sent: AssignValues | undefined;
  await act(() => result.current.handleSubmit((values) => void (sent = values))());
  return sent;
};

describe("useAssignForm: arguments a blok places", () => {
  it("are sent while nothing draws them", async () => {
    expect((await submitted(["slides"]))?.args).toEqual({ slides: "slide A" });
  });

  it("are dropped as hidden when no blok places them", async () => {
    expect((await submitted())?.args).toEqual({});
  });
});
