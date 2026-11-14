import { portHost } from "../host";
import type { ListDependencyFragment } from "../rekuest";
import {
  agentLabel,
  agentsOf,
  awaitsPick,
  levelBelow,
  namesAgents,
  pickHint,
  pickLimits,
  unmetDependencies,
  withLevelBelow,
  withPin,
  type DependencyAgent,
  type DependencyBinding,
  type DependencyNode,
  type ResolvedDependencyInput,
} from "./tree";

import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../../vendor/core/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../../vendor/core/ui/popover";
import { useDebouncedCallback } from "../../vendor/core/util/hooks/useDebouncedCallback";
import { cn } from "../../vendor/core/util/utils";

import { AlertCircle, ChevronRight, ChevronsUpDown, CircleSlash, Zap } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

/**
 * What can bind a dependency. `dependency` narrows to an implementation's, `blokDependency` to a
 * blok's, `values` resolves ones already picked. As text: it goes through the host's service query.
 */
const AGENT_FOR_DEPENDENCY = `
query AgentForDependency($search: String, $values: [ID!], $dependency: ID, $blokDependency: ID) {
  agents: agents(
    filters: { search: $search, ids: $values, dependency: $dependency, blokDependency: $blokDependency }
    pagination: { limit: 10 }
  ) {
    id
    name
    connected
    app { identifier }
    release { version }
    user { sub }
  }
}
`;

/** How many agents the closed field names before it counts the rest. */
const SHOWN_AGENTS = 3;

/** Whose dependency the id names: an implementation's, or a blok's. */
export type DependencyOwner = "implementation" | "blok";

export type DependencyFieldProps = {
  dependency: ListDependencyFragment;
  owner?: DependencyOwner;
  /** This dependency's pin at its level, if it has one. */
  pin: ResolvedDependencyInput | undefined;
  onPin: (pin: ResolvedDependencyInput | undefined) => void;
  /** What the dry run resolved for it: the agents bound, and what they need below. */
  node?: DependencyNode;
  /** The form's own complaint about this pin. */
  error?: string;
};

const PresenceDot = ({ connected }: { connected: boolean | undefined }) => (
  <span
    aria-label={connected ? "Connected" : "Offline"}
    className={cn("size-2 shrink-0 rounded-full", connected ? "bg-green-500" : "bg-muted-foreground/40")}
  />
);

type ShownAgent = { id: string; agent?: DependencyAgent | null };

/** Agents on one line: a presence dot and a name each, the rest counted. */
const AgentNames = ({ agents, className }: { agents: ShownAgent[]; className?: string }) => (
  <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
    {agents.slice(0, SHOWN_AGENTS).map(({ id, agent }) => (
      <span key={id} className="flex min-w-0 items-center gap-1.5">
        <PresenceDot connected={agent?.connected} />
        <span className="truncate">{agentLabel(agent, id)}</span>
      </span>
    ))}
    {agents.length > SHOWN_AGENTS && (
      <span className="shrink-0 text-muted-foreground">+{agents.length - SHOWN_AGENTS}</span>
    )}
  </span>
);

/**
 * One dependency on one line: what it is called, and what will serve it. The
 * line is the picker's trigger: "Automatic" (whoever fits when it runs) or the
 * agents pinned by name. What the agents it reaches need themselves follows
 * below, folded until something there is pinned or unmet.
 */
export const DependencySearchField = ({
  dependency,
  owner = "implementation",
  pin,
  onPin,
  node,
  error: fieldError,
}: DependencyFieldProps) => {
  const [agents, setAgents] = useState<DependencyAgent[]>([]);
  const [agentCache, setAgentCache] = useState<Record<string, DependencyAgent>>({});
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const labelId = useId();
  // A late answer to an earlier search must not replace a newer one.
  const requestRef = useRef(0);

  const host = portHost();
  const { StructureDisplay } = host;
  const run = host.useServiceQuery("rekuest");
  const search = (variables: Record<string, unknown>) =>
    run(AGENT_FOR_DEPENDENCY, variables).then((data) => (data.agents ?? []) as DependencyAgent[]);
  const dependencyFilter =
    owner === "blok" ? { blokDependency: dependency.id } : { dependency: dependency.id };

  // The pin is the selection: it lives in the form, at this level.
  const selectedIds = useMemo(() => pin?.mappedAgents.map((mapped) => mapped.agent) ?? [], [pin]);
  const pinned = selectedIds.length > 0;
  const automatic = !pinned && (pin?.autoResolve ?? false);
  const { max } = pickLimits(dependency);
  const single = max === 1;

  const remember = (found: DependencyAgent[]) =>
    setAgentCache((known) => ({ ...known, ...Object.fromEntries(found.map((agent) => [agent.id, agent])) }));

  const load = (term: string) => {
    if (!dependency.id) {
      setLoaded(true);
      return;
    }
    const request = ++requestRef.current;
    search({ search: term, ...dependencyFilter })
      .then((found) => {
        if (requestRef.current !== request) return;
        setAgents(found);
        remember(found);
        setFailed(false);
      })
      .catch(() => {
        if (requestRef.current !== request) return;
        setAgents([]);
        setFailed(true);
      })
      .finally(() => requestRef.current === request && setLoaded(true));
  };
  const query = useDebouncedCallback(load);

  // Asked when the list is opened, not when the form mounts: most runs never open it.
  useEffect(() => {
    if (open) load(inputValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dependency.id]);

  // The agents the dry run bound are known without asking.
  const boundAgents = useMemo(() => {
    const bound: Record<string, DependencyAgent> = {};
    for (const binding of node?.mappedAgents ?? []) {
      if (binding.agent) bound[binding.agentId] = binding.agent;
    }
    return bound;
  }, [node]);

  // Resolve data for selected agents nothing has told us about yet
  const unknown = selectedIds.filter((id) => !agentCache[id] && !boundAgents[id]).join(",");
  useEffect(() => {
    if (!unknown) return;
    search({ values: unknown.split(",") })
      .then(remember)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unknown]);

  const pinAgents = (agentIds: string[]) => {
    // Nobody named: back to "whoever fits", where the dependency allows it.
    if (agentIds.length === 0) {
      onPin(dependency.autoResolvable ? { key: dependency.key, autoResolve: true, mappedAgents: [] } : undefined);
      return;
    }
    onPin({
      key: dependency.key,
      autoResolve: false,
      // An agent that stays keeps what is pinned below it.
      mappedAgents: agentIds.map(
        (id) => pin?.mappedAgents.find((mapped) => mapped.agent === id) ?? { agent: id, key: dependency.key },
      ),
    });
  };

  const toggleAgent = (agentId: string) => {
    if (single) {
      pinAgents(selectedIds.includes(agentId) ? [] : [agentId]);
      setOpen(false);
      return;
    }
    pinAgents(
      selectedIds.includes(agentId) ? selectedIds.filter((id) => id !== agentId) : [...selectedIds, agentId],
    );
  };

  const chooseAutomatic = () => {
    onPin({ key: dependency.key, autoResolve: true, mappedAgents: [] });
    setOpen(false);
  };

  const chooseNone = () => {
    onPin(undefined);
    setOpen(false);
  };

  // What an assign reaches: the agents named, else what the dry run resolved by itself.
  const named: ShownAgent[] = selectedIds.map((id) => ({ id, agent: agentCache[id] ?? boundAgents[id] }));
  const resolved: ShownAgent[] = pinned
    ? []
    : (node?.mappedAgents ?? []).map((binding) => ({ id: binding.agentId, agent: binding.agent }));
  const complaint = fieldError || node?.unmet || undefined;
  const hint = pickHint(dependency);
  const only = [dependency.appFilter, dependency.versionFilter].filter(Boolean).join(" ");
  const full = !single && selectedIds.length >= max;

  return (
    <div className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-start gap-x-3 gap-y-1.5">
      <div className="flex min-h-8 min-w-0 flex-col justify-center">
        <span id={labelId} className="flex min-w-0 items-baseline gap-1.5 text-sm">
          <span className="truncate font-medium">{dependency.key}</span>
          {dependency.optional && <span className="shrink-0 text-xs text-muted-foreground">optional</span>}
        </span>
        {dependency.description && (
          <span className="line-clamp-2 text-xs text-muted-foreground" title={dependency.description}>
            {dependency.description}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-labelledby={labelId}
              aria-invalid={complaint ? true : undefined}
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-md border border-input bg-transparent px-2.5 text-left text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                complaint && "border-destructive/60",
              )}
            >
              {pinned ? (
                <AgentNames agents={named} className="flex-1" />
              ) : resolved.length > 0 ? (
                <>
                  <Zap aria-label="Chosen automatically" className="size-3.5 shrink-0 text-muted-foreground" />
                  <AgentNames agents={resolved} className="flex-1" />
                </>
              ) : automatic ? (
                <>
                  <Zap className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">Automatic</span>
                </>
              ) : (
                <span className="flex-1 truncate text-muted-foreground">
                  {dependency.optional ? "None" : single ? "Pick an agent…" : "Pick agents…"}
                </span>
              )}
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-[max(var(--radix-popover-trigger-width),20rem)] p-0">
            <Command shouldFilter={false} className="bg-transparent">
              <CommandInput
                placeholder="Search agents…"
                value={inputValue}
                onValueChange={(term) => {
                  setInputValue(term);
                  query(term);
                }}
              />
              {(hint || only) && (
                <div className="px-3.5 pt-2 text-[11px] text-muted-foreground">
                  {[hint, only && `only ${only}`].filter(Boolean).join(" · ")}
                </div>
              )}
              <CommandList>
                {(dependency.autoResolvable || dependency.optional) && (
                  <>
                    <CommandGroup>
                      {dependency.autoResolvable && (
                        <CommandItem value="__automatic" data-checked={automatic} onSelect={chooseAutomatic}>
                          <Zap className="text-muted-foreground" />
                          <span className="flex min-w-0 flex-col">
                            <span>Automatic</span>
                            <span className="text-[11px] text-muted-foreground">Whoever fits when it runs</span>
                          </span>
                        </CommandItem>
                      )}
                      {dependency.optional && (
                        <CommandItem value="__none" data-checked={!pinned && !automatic} onSelect={chooseNone}>
                          <CircleSlash className="text-muted-foreground" />
                          <span>None</span>
                        </CommandItem>
                      )}
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}
                {failed && (
                  <div className="flex items-center gap-2 px-3.5 py-3 text-xs text-destructive">
                    <AlertCircle className="size-3.5 shrink-0" />
                    The agents could not be loaded.
                  </div>
                )}
                {loaded && !failed && agents.length === 0 && (
                  <div className="px-3.5 py-4 text-center text-xs text-muted-foreground">
                    {inputValue ? `No agent matches “${inputValue}”.` : "No agent provides this."}
                  </div>
                )}
                {agents.length > 0 && (
                  <CommandGroup heading={full ? `Agents · ${max} picked, unpick one to change` : "Agents"}>
                    {agents.map((agent) => {
                      const isSelected = selectedIds.includes(agent.id);
                      return (
                        <CommandItem
                          key={agent.id}
                          value={agent.id}
                          data-checked={isSelected}
                          disabled={full && !isSelected}
                          onSelect={() => toggleAgent(agent.id)}
                        >
                          <PresenceDot connected={agent.connected} />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate">{agentLabel(agent, agent.id)}</span>
                            <span className="truncate text-[11px] text-muted-foreground">
                              {agent.app.identifier} · {agent.release.version}
                              {!agent.connected && " · offline"}
                            </span>
                          </span>
                          <StructureDisplay identifier="@lok/user" id={agent.user.sub} variant="avatar" className="size-5" />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {complaint && <p className="text-xs text-destructive">{complaint}</p>}
      </div>

      {node?.mappedAgents.map((binding) => (
        <LevelBelow
          key={binding.agentId}
          binding={binding}
          pins={pin?.mappedAgents.find((mapped) => mapped.agent === binding.agentId)?.dependencies ?? NO_PINS}
          onChange={(next) => onPin(withLevelBelow(pin, node, binding.agentId, next))}
        />
      ))}
    </div>
  );
};

const NO_PINS: ResolvedDependencyInput[] = [];

/**
 * What one bound agent needs itself: a line naming it, the level under it.
 * Folded while it takes care of itself; open once something below is pinned
 * or unmet, and it then stays open.
 */
const LevelBelow = ({
  binding,
  pins,
  onChange,
}: {
  binding: DependencyBinding;
  pins: ResolvedDependencyInput[];
  onChange: (pins: ResolvedDependencyInput[]) => void;
}) => {
  const below = useMemo(() => levelBelow(binding), [binding]);
  const needsLook = namesAgents(pins) || unmetDependencies(below).length > 0;
  const [open, setOpen] = useState(needsLook);
  useEffect(() => {
    if (needsLook) setOpen(true);
  }, [needsLook]);

  if (below.length === 0) return null;
  return (
    <div className="col-span-2 flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className="flex min-w-0 items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className={cn("size-3 shrink-0 transition-transform", open && "rotate-90")} />
        <span className="truncate">
          {agentLabel(binding.agent, binding.agentId)} needs {below.map((inner) => inner.key).join(", ")}
        </span>
      </button>
      {open && (
        <div className="ml-1.5 border-l pl-3">
          <DependencyLevel
            dependencies={below.map((inner) => inner.dependency ?? undeclared(inner.key))}
            nodes={below}
            value={pins}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
};

/** A dependency a task still carries although its implementation no longer declares it. */
const undeclared = (key: string): ListDependencyFragment => ({
  id: "",
  key,
  description: null,
  appFilter: null,
  versionFilter: null,
  autoResolvable: false,
  optional: false,
  minViableInstances: null,
  maxViableInstances: null,
  singular: false,
});

type DependencyLevelProps = {
  dependencies: ListDependencyFragment[];
  /** The dry run's nodes of this level, by key. */
  nodes?: DependencyNode[] | null;
  /** The pins of this level. */
  value: ResolvedDependencyInput[];
  onChange: (pins: ResolvedDependencyInput[]) => void;
  owner?: DependencyOwner;
  errors?: Record<string, { message?: string }>;
};

/** One level of the dependency tree: its dependencies, each with the levels below what it binds. */
const DependencyLevel = ({ dependencies, nodes, value, onChange, owner, errors }: DependencyLevelProps) => (
  <div className="flex flex-col gap-2.5">
    {dependencies.map((dep) => (
      <DependencySearchField
        dependency={dep}
        owner={owner}
        pin={value.find((pin) => pin.key === dep.key)}
        onPin={(pin) => onChange(withPin(value, dep.key, pin))}
        node={nodes?.find((node) => node.key === dep.key)}
        error={errors?.[dep.key]?.message}
        key={dep.key}
      />
    ))}
  </div>
);

export type DependencyContainerProps = {
  dependencies: ListDependencyFragment[];
  bound: string;
  owner?: DependencyOwner;
  /** The assign's dry run (`useDependencyTree`): without it only the root level shows. */
  tree?: DependencyNode[] | null;
};

/**
 * "Runs with": the agents a run reaches besides its own. One line while they
 * resolve by themselves, which is most runs; it opens to one line per
 * dependency when something is pinned, unmet or waiting to be picked, or when
 * asked. Once open it stays open.
 */
export const DependenciesContainer = ({
  dependencies,
  owner,
  tree,
}: DependencyContainerProps) => {
  const form = useFormContext();
  const watched = useWatch({ control: form.control, name: "dependencies" }) as ResolvedDependencyInput[] | undefined;
  const value = useMemo(() => watched ?? [], [watched]);

  // Seed auto-resolve entries for auto-resolvable deps that have no form entry yet
  useEffect(() => {
    const existing = (form.getValues("dependencies") as ResolvedDependencyInput[] | undefined) || [];
    const toSeed = dependencies.filter(
      (dep) => dep.autoResolvable && !existing.some((e) => e.key === dep.key),
    );
    if (toSeed.length > 0) {
      const seeded: ResolvedDependencyInput[] = [
        ...existing,
        ...toSeed.map((dep) => ({
          key: dep.key,
          autoResolve: true,
          mappedAgents: [],
        })),
      ];
      form.setValue("dependencies", seeded, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-dependency form errors (path: dependencies.{dep.key})
  const errors = form.formState.errors?.dependencies as Record<string, { message?: string }> | undefined;
  const unmet = useMemo(() => unmetDependencies(tree), [tree]);
  const waiting = dependencies.filter((dep) => awaitsPick(dep, value.find((pin) => pin.key === dep.key)));
  const refused = dependencies.filter((dep) => errors?.[dep.key]?.message);
  const troubled = unmet.length > 0 || refused.length > 0;
  const needsLook = troubled || waiting.length > 0 || namesAgents(value);

  const [open, setOpen] = useState(needsLook);
  useEffect(() => {
    if (needsLook) setOpen(true);
  }, [needsLook]);

  if (dependencies.length === 0) return null;

  const reached = agentsOf(tree);
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className="flex min-w-0 items-center gap-1.5 text-left text-sm"
      >
        <ChevronRight
          className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
        />
        <span className="shrink-0 font-medium">Runs with</span>
        {!open &&
          (troubled ? (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="size-3.5" />
              {Math.max(unmet.length, refused.length)} not met
            </span>
          ) : reached.length > 0 ? (
            <AgentNames agents={reached} className="text-xs text-muted-foreground" />
          ) : (
            <span className="truncate text-xs text-muted-foreground">
              {dependencies.length} {dependencies.length === 1 ? "other agent" : "other agents"}, chosen automatically
            </span>
          ))}
      </button>
      {open && (
        <DependencyLevel
          dependencies={dependencies}
          nodes={tree}
          value={value}
          onChange={(next) => form.setValue("dependencies", next, { shouldValidate: true })}
          owner={owner}
          errors={errors}
        />
      )}
    </div>
  );
};
