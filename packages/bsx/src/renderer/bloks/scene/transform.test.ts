// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { analyzeBsx } from "../../../bsx/analyze";
import { mountedBlokScope } from "../../../bsx/references";

/** A scene blok that declares the local `pose`, around `body` (a `<Scene>`). */
const analyze = (body: string) =>
  analyzeBsx(`<Blok kind="agent" context="scene"><local name="pose" persist />${body}</Blok>`, { scope: mountedBlokScope() });

describe("Transform", () => {
  it("places what it holds in a scene, bound to a local the gizmo writes", () => {
    const { tree, markers } = analyze('<Scene><Transform bind={pose} mode="rotate"><Transform /></Transform></Scene>');
    expect(markers).toEqual([]);
    expect(tree?.children?.[1]?.children?.[0]?.component).toBe("Transform");
  });

  it("keeps its own pose by id when it persists", () => {
    const { markers } = analyze('<Scene><Transform id="arm-pose" persist /></Scene>');
    expect(markers.filter((marker) => marker.severity === "error")).toEqual([]);
  });

  it("stands only in a scene", () => {
    expect(
      analyzeBsx('<Blok kind="agent" context="panel"><local name="pose" /><Transform bind={pose} /></Blok>', { scope: mountedBlokScope() }).markers.length,
    ).toBeGreaterThan(0);
  });
});
