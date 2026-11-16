// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as z from "zod";

import { cleanup, screen } from "@testing-library/react";
import { renderBsx, testCatalog} from "./bloks/testing";
import { addBlokComponents } from "./catalog";
import { createBlokCatalog, createBlokComponent } from "./runtime";

const part = (name: string) => createBlokComponent({ name, schema: z.object({}) }, () => null);
/** A component of the base catalog, as `implementBlokCatalog` tags one of its families'. */
const base = (name: string) => ({ ...part(name), origin: "base@4" });

describe("addBlokComponents", () => {
  it("adds a module's components and takes them back out", () => {
    const catalog = createBlokCatalog("test", [part("Card")]);
    const undo = addBlokComponents([part("MikroScene")], catalog);
    expect([...catalog.components.keys()]).toEqual(["Card", "MikroScene"]);
    undo();
    expect([...catalog.components.keys()]).toEqual(["Card"]);
  });

  it("refuses a name the catalog already holds, adding none of them", () => {
    const catalog = createBlokCatalog("test", [part("Card"), part("foreach"), part("MikroScene")]);
    // Base's names and the app's own are never drawn over.
    expect(() => addBlokComponents([part("Fresh"), part("foreach")], catalog)).toThrow(/foreach/);
    expect(() => addBlokComponents([part("Fresh"), part("MikroScene")], catalog)).toThrow(/MikroScene/);
    expect([...catalog.components.keys()]).toEqual(["Card", "foreach", "MikroScene"]);
  });

  it("never draws over a component of the base catalog: a catalog only adds", () => {
    const standard = base("Slider");
    const catalog = createBlokCatalog("test", [standard]);
    expect(() => addBlokComponents([part("Slider")], catalog)).toThrow(/Slider/);
    expect(catalog.components.get("Slider")).toBe(standard);
  });

  it("renders the module's component where a blok uses the name", () => {
    const mine = createBlokComponent({ name: "Gauge", schema: z.object({}) }, () => <span>my gauge</span>);
    const undo = addBlokComponents([mine], testCatalog());
    try {
      renderBsx(testCatalog(), "<Card><Gauge /></Card>");
      expect(screen.queryByText("my gauge")).not.toBeNull();
    } finally {
      cleanup();
      undo();
    }
    expect(testCatalog().components.has("Gauge")).toBe(false);
  });
});
