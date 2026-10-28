// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as z from "zod";

import { cleanup, screen } from "@testing-library/react";
import { renderBsx, testCatalog} from "./bloks/testing";
import { addBlokComponents } from "./catalog";
import { moduleShadowsOf } from "./modules";
import { createBlokCatalog, createBlokComponent } from "./runtime";

const part = (name: string) => createBlokComponent({ name, schema: z.object({}) }, () => null);
/** A component of a global catalog, as `implementBlokCatalog` tags it. */
const global = (name: string) => ({ ...part(name), origin: "ui@1" });

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

  it("lets a module draw over a standard component, once, and puts it back", () => {
    const standard = global("Slider");
    const mine = part("Slider");
    const catalog = createBlokCatalog("test", [standard]);
    const undo = addBlokComponents([mine], catalog);
    expect(catalog.components.get("Slider")).toBe(mine);
    // A second module cannot draw over it again.
    expect(() => addBlokComponents([part("Slider")], catalog)).toThrow(/Slider/);
    undo();
    expect(catalog.components.get("Slider")).toBe(standard);
  });

  it("renders the module's component where a blok uses the name", () => {
    const mine = createBlokComponent({ name: "Slider", schema: z.object({}) }, () => <span>my slider</span>);
    const undo = addBlokComponents([mine], testCatalog());
    try {
      renderBsx(testCatalog(), "<Card><Slider /></Card>");
      expect(screen.queryByText("my slider")).not.toBeNull();
    } finally {
      cleanup();
      undo();
    }
  });

  it("records a drawn-over global component as the module's own until undone", () => {
    const catalog = createBlokCatalog("test", [global("Slider")]);
    expect(moduleShadowsOf(catalog).has("Slider")).toBe(false);
    const undo = addBlokComponents([part("Slider")], catalog);
    expect(moduleShadowsOf(catalog).has("Slider")).toBe(true);
    undo();
    expect(moduleShadowsOf(catalog).has("Slider")).toBe(false);
  });
});
