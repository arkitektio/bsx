import { Card } from "../../vendor/core/ui/card";
import { cn } from "../../vendor/core/util/utils";

export const NotImplementedYet = (props: {
  message?: string;
  className?: string;
}) => {
  return (
    <Card className={cn("text-xs bg-red-700 p-1", props.className)}>
      <b className=" font-semibold"> Not implemented: </b>
      {props.message || "This feature is not implemented yet"}
    </Card>
  );
};
