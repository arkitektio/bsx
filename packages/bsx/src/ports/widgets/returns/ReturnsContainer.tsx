import { type ReturnContainerProps } from "../../engine/tailwind";
import { type PortGroup, type ReturnPort } from "../../engine/types";
import { portGridClass } from "../gridColumns";

export type FilledGroup = PortGroup & {
  ports: ReturnPort[];
};

export const ReturnsContainer = ({
  ports,
  values,
  options,
  registry,
}: ReturnContainerProps) => {
  return (
    <div className={`${portGridClass(ports.length)} w-full h-full`}>
      {ports.map((port) => {
        const Widget = registry.getReturnWidgetForPort(port);

        return (
          <Widget
            key={port.key}
            value={values[port.key]}
            port={port}
            widget={port.widget}
            options={options}
          />
        );
      })}
    </div>
  );
};
