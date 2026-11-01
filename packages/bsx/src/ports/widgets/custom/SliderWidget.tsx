import { portDescription, portLabel } from "../../engine/portPresentation";
import { SliderField } from "../../forms/SliderField";
import { type SliderAssignWidgetFragment } from "../../rekuest";
import { type InputWidgetProps } from "../../engine/types";
import { pathToName } from "../../engine/utils";

export const SliderWidget = (
  props: InputWidgetProps<SliderAssignWidgetFragment>,
) => {
  return (
    <SliderField
      name={pathToName(props.path)}
      label={portLabel(props.port)}
      description={portDescription(props.port, props.widget)}
      min={props.widget?.min || undefined}
      max={props.widget?.max || undefined}
      step={props.widget?.step || undefined}
    />
  );
};
