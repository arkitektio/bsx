import { portDescription, portLabel } from "../../engine/portPresentation";
import { DateTimeField } from "../../forms/DateTimeField";
import { type InputWidgetProps } from "../../engine/types";
import { pathToName } from "../../engine/utils";

export const DateWidget = (props: InputWidgetProps) => {
  return (
    <DateTimeField
      name={pathToName(props.path)}
      label={portLabel(props.port)}
      description={portDescription(props.port, props.widget)}
    />
  );
};
