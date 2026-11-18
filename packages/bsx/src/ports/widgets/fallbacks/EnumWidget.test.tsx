// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../rekuest", () => ({ PortKind: { Enum: "ENUM" } }));

import type { InputWidgetProps } from "../../engine/types";
import { ChoicePortField } from "./EnumWidget";

const LONG = "A choice whose label is far too long for the column it sits in";

const portWith = (choices: { value: string; label: string; description?: string }[]) =>
  ({ key: "mode", kind: "ENUM", label: "Mode", choices }) as unknown as InputWidgetProps["port"];

const Harness = ({ port, value }: { port: InputWidgetProps["port"]; value?: string }) => {
  const form = useForm({ defaultValues: { mode: value } });
  return (
    <FormProvider {...form}>
      <ChoicePortField port={port} widget={null as never} path={["mode"]} />
    </FormProvider>
  );
};

/** jsdom lays nothing out: say every marked text is (or is not) cut off. */
const cutOff = (yes: boolean) => {
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return yes && this.hasAttribute("data-overflow-text") ? 200 : 0;
  });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(0);
};

const tooltip = () => document.querySelector("[data-slot=tooltip-content]");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ChoicePortField: segmented", () => {
  const port = portWith([
    { value: "a", label: LONG },
    { value: "b", label: "Short", description: "What short does" },
  ]);

  it("shows no tooltip for a label that fits", () => {
    cutOff(false);
    render(<Harness port={port} />);
    act(() => void fireEvent.focus(screen.getByRole("radio", { name: LONG })));
    expect(tooltip()).toBeNull();
  });

  it("shows the whole label when it is cut off", () => {
    cutOff(true);
    render(<Harness port={port} />);
    act(() => void fireEvent.focus(screen.getByRole("radio", { name: LONG })));
    expect(tooltip()?.textContent).toContain(LONG);
  });

  it("always shows a choice's description, under its label", () => {
    cutOff(false);
    render(<Harness port={port} />);
    act(() => void fireEvent.focus(screen.getByRole("radio", { name: "Short" })));
    expect(tooltip()?.textContent).toContain("Short");
    expect(tooltip()?.textContent).toContain("What short does");
  });
});

describe("ChoicePortField: select", () => {
  const port = portWith(
    Array.from({ length: 6 }, (_, i) => ({ value: `v${i}`, label: i === 2 ? LONG : `Choice ${i}` })),
  );

  it("shows the chosen label when the trigger cuts it off", () => {
    cutOff(true);
    render(<Harness port={port} value="v2" />);
    act(() => void fireEvent.focus(screen.getByRole("combobox")));
    expect(tooltip()?.textContent).toContain(LONG);
  });

  it("shows nothing when the chosen label fits", () => {
    cutOff(false);
    render(<Harness port={port} value="v2" />);
    act(() => void fireEvent.focus(screen.getByRole("combobox")));
    expect(tooltip()).toBeNull();
  });
});
