import { portDescription, portLabel } from "../../engine/portPresentation";
import { QuantityField } from "../../forms/QuantityField";
import { type InputWidgetProps } from "../../engine/types";
import { pathToName } from "../../engine/utils";

/**
 * Input widget for a QUANTITY port. The value is stored as a magnitude+unit wire
 * string ("100 ms"); the unit dropdown is populated from the port's
 * `proposedUnits`, defaulting to its `referenceUnit`. Mirrors `FloatWidget`.
 */
export const QuantityWidget = (props: InputWidgetProps) => {
  const proposed = props.port.proposedUnits ?? [];
  const reference = props.port.referenceUnit ?? undefined;

  // Ensure the reference unit is always offered, even if not in proposedUnits.
  const units =
    reference && !proposed.includes(reference)
      ? [reference, ...proposed]
      : proposed;

  return (
    <QuantityField
      name={pathToName(props.path)}
      label={portLabel(props.port)}
      description={portDescription(props.port, props.widget)}
      units={units}
      defaultUnit={reference}
    />
  );
};
