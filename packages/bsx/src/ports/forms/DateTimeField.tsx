import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../vendor/core/ui/form";
import { useFormContext } from "react-hook-form";
import { DateTimePicker } from "../../vendor/core/ui/datetime-picker";
import { type FieldProps } from "./types";

export const DateTimeField = (props: FieldProps) => {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name={props.name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>
            {props.label != undefined ? props.label : props.name}
          </FormLabel>
          <DateTimePicker value={field.value} onChange={field.onChange} />
          <FormDescription>{props.description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
