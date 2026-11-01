import { type InputWidgetProps } from "../../engine/types";
import { type ChoiceAssignWidgetFragment } from "../../rekuest";
import { ChoicePortField } from "../fallbacks/EnumWidget";

/**
 * Choices live on the port; the widget only adds its placeholder, which
 * `ChoicePortField` reads through `portPlaceholder`.
 */
export const ChoicesWidget = (props: InputWidgetProps<ChoiceAssignWidgetFragment>) => (
  <ChoicePortField {...props} />
);
