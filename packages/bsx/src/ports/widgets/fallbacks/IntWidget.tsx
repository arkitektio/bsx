import { portDescription, portLabel } from "../../engine/portPresentation";
import { IntField } from "../../forms/IntField";
import { type InputWidgetProps } from "../../engine/types";
import { pathToName } from "../../engine/utils";

export const IntWidget = (props: InputWidgetProps) => {
  return (
    <IntField
      name={pathToName(props.path)}
      label={portLabel(props.port)}
      description={portDescription(props.port, props.widget)}
    />
  );
};
