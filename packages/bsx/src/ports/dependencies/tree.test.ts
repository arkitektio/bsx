import { describe, expect, it } from "vitest";
import type { ListDependencyFragment } from "../rekuest";
import {
  type DependencyNode,
  agentLabel,
  agentsOf,
  awaitsPick,
  levelBelow,
  namesAgents,
  pickHint,
  pickLimits,
  pinsFromFrozen,
  toPins,
  unmetDependencies,
  withLevelBelow,
  withPin,
} from "./tree";

const node = (key: string, over: Partial<DependencyNode> = {}): DependencyNode => ({
  key,
  mappedAgents: [],
  ...over,
});

/** `agent` bound to `key`, with `below` under its one implementation. */
const bound = (key: string, agent: string, below: DependencyNode[] = []): DependencyNode =>
  node(key, {
    mappedAgents: [{ agentId: agent, mappedImplementations: [{ key, resolvedDependencies: below }] }],
  });

describe("toPins", () => {
  it("keeps the input's own fields, level by level", () => {
    const form = [
      {
        key: "relay",
        mappedAgents: [
          {
            key: "relay",
            agent: "7",
            mappedActions: [],
            dependencies: [{ key: "leaf", autoResolve: true, mappedAgents: [] }],
          },
          { key: "relay", agent: "8", dependencies: [] },
        ],
      },
    ];
    expect(toPins(form as never)).toEqual([
      {
        key: "relay",
        autoResolve: false,
        mappedAgents: [
          {
            key: "relay",
            agent: "7",
            dependencies: [{ key: "leaf", autoResolve: true, mappedAgents: [] }],
          },
          { key: "relay", agent: "8" },
        ],
      },
    ]);
    expect(toPins(undefined)).toEqual([]);
  });
});

describe("withPin", () => {
  const a = { key: "a", mappedAgents: [{ key: "a", agent: "1" }] };
  const b = { key: "b", autoResolve: true, mappedAgents: [] };

  it("replaces a pin in place and appends a new one", () => {
    const next = { key: "a", mappedAgents: [{ key: "a", agent: "2" }] };
    expect(withPin([a, b], "a", next)).toEqual([next, b]);
    expect(withPin([b], "a", a)).toEqual([b, a]);
  });

  it("drops a pin that neither names an agent nor resolves by itself", () => {
    expect(withPin([a, b], "a", { key: "a", autoResolve: false, mappedAgents: [] })).toEqual([b]);
    expect(withPin([a, b], "b", undefined)).toEqual([a]);
  });
});

describe("levelBelow", () => {
  it("reads every implementation bound on the agent as one level", () => {
    const binding = {
      agentId: "7",
      mappedImplementations: [
        { key: "snap", resolvedDependencies: [node("stage"), node("light")] },
        { key: "move", resolvedDependencies: [node("stage", { unmet: "no agent" })] },
      ],
    };
    expect(levelBelow(binding).map((n) => [n.key, n.unmet ?? null])).toEqual([
      ["stage", "no agent"],
      ["light", null],
    ]);
  });
});

describe("withLevelBelow", () => {
  const below = [{ key: "leaf", mappedAgents: [{ key: "leaf", agent: "9" }] }];

  it("hangs the pins under the agent they are for", () => {
    const pin = { key: "relay", mappedAgents: [{ key: "relay", agent: "7" }, { key: "relay", agent: "8" }] };
    expect(withLevelBelow(pin, bound("relay", "7"), "7", below)).toEqual({
      key: "relay",
      autoResolve: false,
      mappedAgents: [
        { key: "relay", agent: "7", dependencies: below },
        { key: "relay", agent: "8" },
      ],
    });
  });

  it("pins what resolved by itself first, so the level below has an agent to sit under", () => {
    const resolved = node("relay", {
      mappedAgents: [
        { agentId: "7", mappedImplementations: [] },
        { agentId: "8", mappedImplementations: [] },
      ],
    });
    const auto = { key: "relay", autoResolve: true, mappedAgents: [] };
    for (const pin of [undefined, auto]) {
      expect(withLevelBelow(pin, resolved, "8", below).mappedAgents).toEqual([
        { key: "relay", agent: "7" },
        { key: "relay", agent: "8", dependencies: below },
      ]);
    }
  });
});

describe("unmetDependencies", () => {
  it("finds what is unmet at any level, with the keys that lead to it", () => {
    const tree = [
      bound("relay", "7", [node("leaf", { unmet: "Dependency leaf was not provided with an overwrite" })]),
      node("stage", { unmet: "Not enough agents" }),
    ];
    expect(unmetDependencies(tree)).toEqual([
      { path: ["relay", "leaf"], reason: "Dependency leaf was not provided with an overwrite" },
      { path: ["stage"], reason: "Not enough agents" },
    ]);
    expect(unmetDependencies(undefined)).toEqual([]);
  });
});

describe("pinsFromFrozen", () => {
  it("pins a task's bindings again, level by level", () => {
    const frozen = [
      {
        key: "relay",
        mappedAgents: [
          {
            agent: { id: "7" },
            mappedImplementations: [
              { key: "echo", resolvedDependencies: [{ key: "leaf", mappedAgents: [{ agentId: "9" }] }] },
            ],
          },
        ],
      },
      { key: "maybe", mappedAgents: [] },
    ];
    expect(pinsFromFrozen(frozen)).toEqual([
      {
        key: "relay",
        autoResolve: false,
        mappedAgents: [
          {
            key: "relay",
            agent: "7",
            dependencies: [{ key: "leaf", autoResolve: false, mappedAgents: [{ key: "leaf", agent: "9" }] }],
          },
        ],
      },
      // Unbound when it ran: unbound again, not resolved anew.
      { key: "maybe", autoResolve: false, mappedAgents: [] },
    ]);
  });
});

const declared = (over: Partial<ListDependencyFragment> = {}): ListDependencyFragment => ({
  id: "1",
  key: "stage",
  autoResolvable: false,
  optional: false,
  singular: false,
  ...over,
});

describe("how many agents a dependency takes", () => {
  it("is one for a singular dependency, whatever else it says", () => {
    expect(pickLimits(declared({ singular: true, maxViableInstances: 4 }))).toEqual({ min: 1, max: 1 });
    expect(pickHint(declared({ singular: true }))).toBe("One agent");
  });

  it("reads its bounds, and says nothing when there are none", () => {
    expect(pickLimits(declared({ minViableInstances: 2, maxViableInstances: 3 }))).toEqual({ min: 2, max: 3 });
    expect(pickHint(declared({ minViableInstances: 2, maxViableInstances: 3 }))).toBe("2–3 agents");
    expect(pickHint(declared({ minViableInstances: 2, maxViableInstances: 2 }))).toBe("2 agents");
    expect(pickHint(declared({ maxViableInstances: 3 }))).toBe("Up to 3 agents");
    expect(pickHint(declared({ minViableInstances: 2 }))).toBe("At least 2 agents");
    expect(pickLimits(declared())).toEqual({ min: 1, max: Infinity });
    expect(pickHint(declared())).toBeNull();
  });

  it("may be none for an optional one", () => {
    expect(pickLimits(declared({ optional: true })).min).toBe(0);
  });
});

describe("agentLabel", () => {
  const agent = { id: "7", connected: true, app: { identifier: "live.mikro" }, release: { version: "1" }, user: { sub: "1" } };

  it("is the agent's name, else its app, else its id", () => {
    expect(agentLabel({ ...agent, name: "lab-nas" }, "7")).toBe("lab-nas");
    expect(agentLabel({ ...agent, name: " " }, "7")).toBe("live.mikro");
    expect(agentLabel(undefined, "7")).toBe("7");
  });
});

describe("what waits for the user", () => {
  it("is a required dependency that may not resolve by itself and names nobody", () => {
    expect(awaitsPick(declared(), undefined)).toBe(true);
    expect(awaitsPick(declared(), { key: "stage", mappedAgents: [{ key: "stage", agent: "7" }] })).toBe(false);
    expect(awaitsPick(declared({ optional: true }), undefined)).toBe(false);
  });

  it("is not one that resolves by itself, until that is switched off", () => {
    const auto = declared({ autoResolvable: true });
    expect(awaitsPick(auto, undefined)).toBe(false);
    expect(awaitsPick(auto, { key: "stage", autoResolve: true, mappedAgents: [] })).toBe(false);
    expect(awaitsPick(auto, { key: "stage", autoResolve: false, mappedAgents: [] })).toBe(true);
  });
});

describe("what a level reaches", () => {
  it("names an agent only where a pin does", () => {
    expect(namesAgents([{ key: "stage", autoResolve: true, mappedAgents: [] }])).toBe(false);
    expect(namesAgents([{ key: "stage", mappedAgents: [{ key: "stage", agent: "7" }] }])).toBe(true);
    expect(namesAgents(undefined)).toBe(false);
  });

  it("lists every agent once, in the order bound", () => {
    expect(agentsOf([bound("a", "7"), bound("b", "8"), bound("c", "7")]).map((agent) => agent.id)).toEqual(["7", "8"]);
    expect(agentsOf(undefined)).toEqual([]);
  });
});
