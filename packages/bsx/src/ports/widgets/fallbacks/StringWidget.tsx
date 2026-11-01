import { portDescription, portLabel } from "../../engine/portPresentation";
import { ParagraphField } from "../../forms/ParagraphField";
import { StringField } from "../../forms/StringField";
import { type AssignWidgetFragment, type StringAssignWidgetFragment } from "../../rekuest";
import { type InputWidgetProps } from "../../engine/types";
import { pathToName } from "../../engine/utils";

const asStringWidget = (
  widget: AssignWidgetFragment | null | undefined,
): StringAssignWidgetFragment | null =>
  widget?.__typename === "StringAssignWidget" ? widget : null;

/** STRING fallback; also the renderer for `StringAssignWidget` (placeholder, paragraph). */
export const StringWidget = (props: InputWidgetProps) => {
  const widget = asStringWidget(props.widget);
  const Field = widget?.asParagraph ? ParagraphField : StringField;

  return (
    <Field
      name={pathToName(props.path)}
      label={portLabel(props.port)}
      description={portDescription(props.port, props.widget)}
      placeholder={widget?.placeholder || undefined}
    />
  );
};
