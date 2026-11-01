import {
  type ProxyWidgetFragment,
} from "../../rekuest";
import { type InputWidgetProps } from "../../engine/types";

export const ProxyWidget = (
  props: InputWidgetProps<ProxyWidgetFragment>,
) => {
  if (!props.bound) {
    return <div>Proxy widget requires a bound agent to function.</div>;
  }

  if (props.widget.targetDependency) {
    return (
      <div>
        This widget is currently not compatible with dependencies. Please remove
        the dependency to use it.
      </div>
    );
  }


  return (
    <>
      Not implemented yet.
    </>
  );
};
