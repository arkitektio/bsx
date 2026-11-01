import { NotImplementedYet } from "../../../layout/NotImplemented";
import { type ReturnWidgetProps } from "../../../engine/types";
import React from "react";

const UnionReturnWidget: React.FC<ReturnWidgetProps> = () => {
  return (
    <div className="text-foreground">
      <NotImplementedYet />
    </div>
  );
};

export { UnionReturnWidget };
