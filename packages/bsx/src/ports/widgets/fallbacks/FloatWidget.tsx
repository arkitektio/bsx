import { portDescription, portLabel } from "../../engine/portPresentation";
import { FloatField } from "../../forms/FloatField";
import { type InputWidgetProps } from "../../engine/types";
import { pathToName } from "../../engine/utils";

export const FloatWidget = (props: InputWidgetProps) => {

  return (
    <FloatField
      name={pathToName(props.path)}
      label={portLabel(props.port)}
      description={portDescription(props.port, props.widget)}
    />
  );
};
