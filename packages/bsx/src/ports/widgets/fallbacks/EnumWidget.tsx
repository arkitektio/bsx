import { SearchField, type SearchOptions } from "../../forms/SearchField";
import { Name } from "../../../vendor/core/ui/name";
import {
  choicePresentation,
  portDescription,
  portLabel,
  portPlaceholder,
} from "../../engine/portPresentation";
import { type InputWidgetProps } from "../../engine/types";
import { pathToName } from "../../engine/utils";
import { Button } from "../../../vendor/core/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../vendor/core/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../vendor/core/ui/select";
import { ToggleGroup, ToggleGroupItem } from "../../../vendor/core/ui/toggle-group";
import { OVERFLOW_TEXT, OverflowTooltip } from "../../../vendor/core/ui/overflow-tooltip";
import { notEmpty } from "../../../vendor/core/util/utils";
import { X } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";

type Choice = { value: string; label: string; description?: string | null };

/** What a cut-off choice shows on hover: its whole label, then its description. */
const ChoiceTip = ({ choice }: { choice: Choice }) => (
  <div className="flex flex-col gap-0.5">
    <span className="font-medium">{choice.label}</span>
    {choice.description && <span className="opacity-80">{choice.description}</span>}
  </div>
);

/**
 * A port's `choices`, shown by how many there are: a few sit side by side,
 * a handful go in a dropdown, a long list is searched. The stored value is
 * the choice's `value` either way. Also what `ChoiceAssignWidget` renders
 * (the widget only adds a placeholder).
 */
export const ChoicePortField = (props: InputWidgetProps) => {
  const form = useFormContext();
  const name = pathToName(props.path);
  const choices = useMemo(
    () => (props.port.choices ?? []).filter(notEmpty) as Choice[],
    [props.port.choices],
  );
  const label = portLabel(props.port);
  const description = portDescription(props.port, props.widget);
  const placeholder = portPlaceholder(props.port, props.widget);
  const presentation = choicePresentation(choices.length);

  const search = useCallback(
    async (searching: SearchOptions) => {
      if (searching.values) {
        return choices.filter((c) => searching.values?.includes(c.value));
      }
      const needle = searching.search?.trim().toLowerCase();
      if (!needle) return choices;
      return choices.filter(
        (c) => c.label.toLowerCase().includes(needle) || c.value.toLowerCase().includes(needle),
      );
    },
    [choices],
  );

  if (presentation === "search") {
    return (
      <SearchField
        name={name}
        label={label}
        search={search}
        description={description}
        noOptionFoundPlaceholder="No options found"
        commandPlaceholder={placeholder}
      />
    );
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const value = typeof field.value === "string" ? field.value : "";
        const chosen = choices.find((c) => c.value === value);
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            {presentation === "segmented" ? (
              <FormControl>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={value}
                  // Radix sends "" when the pressed one is pressed again:
                  // that clears an optional port and is ignored otherwise.
                  onValueChange={(next) => {
                    if (next) field.onChange(next);
                    else if (props.port.nullable) field.onChange(undefined);
                  }}
                  className="w-full"
                >
                  {choices.map((choice) => (
                    <OverflowTooltip
                      key={choice.value}
                      content={<ChoiceTip choice={choice} />}
                      always={!!choice.description}
                    >
                      <ToggleGroupItem
                        value={choice.value}
                        aria-label={choice.label}
                        className="min-w-0 flex-1 px-2"
                      >
                        <Name>{choice.label}</Name>
                      </ToggleGroupItem>
                    </OverflowTooltip>
                  ))}
                </ToggleGroup>
              </FormControl>
            ) : (
              <div className="flex min-w-0 items-center gap-1">
                <Select value={value} onValueChange={field.onChange}>
                  <OverflowTooltip
                    content={chosen ? <ChoiceTip choice={chosen} /> : placeholder}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue {...OVERFLOW_TEXT} placeholder={placeholder} />
                      </SelectTrigger>
                    </FormControl>
                  </OverflowTooltip>
                  <SelectContent>
                    {choices.map((choice) => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {/* Wraps in the list; cut off (with a tooltip) in the trigger. */}
                        <span
                          {...OVERFLOW_TEXT}
                          className="in-data-[slot=select-value]:min-w-0 in-data-[slot=select-value]:truncate"
                        >
                          {choice.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {props.port.nullable && value !== "" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Clear ${label}`}
                    onClick={() => field.onChange(undefined)}
                  >
                    <X />
                  </Button>
                )}
              </div>
            )}
            <FormDescription>{chosen?.description || description}</FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export const EnumWidget = ChoicePortField;
