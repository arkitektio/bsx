import { portDescription, portLabel } from "../../engine/portPresentation";
import { type InputWidgetProps } from "../../engine/types";
import { pathToName } from "../../engine/utils";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../vendor/core/ui/form";
import { Switch } from "../../../vendor/core/ui/switch";
import { useFormContext } from "react-hook-form";

/**
 * Label, control, hint like every other port, so a switch lines up with the
 * inputs beside it: the switch sits in a row as tall as an input.
 */
export const BoolWidget = (props: InputWidgetProps) => {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name={pathToName(props.path)}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{portLabel(props.port)}</FormLabel>
          <div className="flex h-7 items-center">
            <FormControl>
              <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
            </FormControl>
          </div>
          <FormDescription>{portDescription(props.port, props.widget)}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
