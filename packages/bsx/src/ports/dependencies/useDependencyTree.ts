import { useEffect, useMemo, useState } from "react";
import { useWatch, type Control, type FieldValues } from "react-hook-form";
import { portHost } from "../host";
import { toPins, unmetDependencies, type DependencyNode, type ResolvedDependencyInput } from "./tree";

/** How deep the dry run is read: a selection cannot recurse, and what lies below is not shown. */
const LEVELS_BELOW_ROOT = 4;

const POLL_MS = 10_000;

const NODE = `
  key
  unmet
  dependency { id key description appFilter versionFilter autoResolvable optional minViableInstances maxViableInstances singular }
`;

const BINDING = `key implementation { id interface action { id name } }`;

const level = (below: number): string => `
  ${NODE}
  mappedAgents {
    agentId
    agent { id name connected app { identifier } release { version } user { sub } }
    mappedImplementations {
      ${BINDING}
      ${below > 0 ? `resolvedDependencies { ${level(below - 1)} }` : ""}
    }
  }
`;

/** As text: it goes through the host's service query. */
const DEPENDENCY_TREE = `
query DependencyTree($input: DependencyTreeInput!) {
  dependencyTree(input: $input) {
    satisfied
    dependencies { ${level(LEVELS_BELOW_ROOT)} }
  }
}
`;

type Answer = { dependencyTree?: { satisfied: boolean; dependencies: DependencyNode[] } };

/**
 * The dry run of the assign a form is about to make: the dependency tree its
 * pins (the form's `dependencies`) resolve to, and what is still unmet in it.
 * Asked again whenever a pin changes, and now and then, since agents come
 * and go.
 *
 * While a changed pin is asked about, the tree of the pins before it stays
 * (`pending` says so): the rows keep what they show, and an unmet tree does
 * not read as met for the length of a round trip.
 *
 * A server that cannot answer (an older one) leaves `satisfied` undefined:
 * the form then shows the root level alone and the assign itself decides.
 */
export const useDependencyTree = <TValues extends FieldValues>(
  implementation: { id: string; dependencies: readonly unknown[] } | null | undefined,
  control: Control<TValues>,
) => {
  const watched = useWatch({ control, name: "dependencies" as never }) as ResolvedDependencyInput[] | undefined;
  const key = JSON.stringify(toPins(watched));
  const run = portHost().useServiceQuery("rekuest");
  const id = implementation && implementation.dependencies.length > 0 ? implementation.id : null;
  // Kept with what it answers: another implementation's tree is nobody's, and an older pin's is stale.
  const [answer, setAnswer] = useState<{ id: string; key: string; tree: Answer["dependencyTree"] } | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setError(null);
    if (!id) return undefined;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ask = () => {
      run(DEPENDENCY_TREE, { input: { implementation: id, dependencies: JSON.parse(key) } })
        .then((data) => {
          if (!live) return;
          setAnswer({ id, key, tree: (data as Answer).dependencyTree });
          timer = setTimeout(ask, POLL_MS);
        })
        // A server that refuses once will refuse again: no use asking every ten seconds.
        .catch((failure: unknown) => {
          if (live) setError(failure instanceof Error ? failure : new Error(String(failure)));
        });
    };
    ask();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
    // `run` is rebuilt by some hosts on every render; what it asks is decided by these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, key]);

  const tree = !error && id && answer?.id === id ? answer.tree : undefined;
  const nodes = tree?.dependencies;
  const unmet = useMemo(() => unmetDependencies(nodes), [nodes]);
  const pending = Boolean(id) && !error && answer?.key !== key;
  return { nodes, satisfied: tree?.satisfied, unmet, error, pending };
};
