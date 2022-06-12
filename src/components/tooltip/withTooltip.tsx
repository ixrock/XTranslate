// Tooltip decorator for simple composition with other components

import React, { HTMLAttributes, ReactElement, ReactNode } from "react"
import hoistNonReactStatics from "hoist-non-react-statics";
import { Tooltip, TooltipProps } from "./tooltip";
import { isReactNode } from "../../utils/isReactNode";
import uniqueId from "lodash/uniqueId"

export interface TooltipDecoratorProps {
  tooltip?: ReactNode | Omit<TooltipProps, "htmlFor">;
}

/**
 * @deprecated
 */
export function withTooltip<T extends React.ComponentType<any>>(Target: T): T {
  var DecoratedComponent = class extends React.Component<HTMLAttributes<any> & TooltipDecoratorProps> {
    static displayName = `withTooltip(${Target.displayName || Target.name})`;

    protected tooltipId = uniqueId("tooltip_target_");

    render() {
      var { tooltip, ...targetProps } = this.props;
      var tooltipElem: ReactElement;

      if (tooltip) {
        var tooltipId = targetProps.id || this.tooltipId;
        var tooltipProps: TooltipProps = {
          htmlFor: tooltipId,
          following: true,
          ...(isReactNode(tooltip) ? { children: tooltip } : tooltip),
        };
        if (!tooltipProps.following) {
          targetProps.style = {
            position: "relative",
            ...(targetProps.style || {})
          }
        }
        targetProps.id = tooltipId;
        tooltipElem = <Tooltip {...tooltipProps}/>;
        targetProps.children = (
          <>
            {targetProps.children}
            {tooltipElem}
          </>
        )
      }
      return (
        <Target
          {...targetProps as any}
          tooltip={tooltipElem}
        />
      );
    }
  }

  return hoistNonReactStatics(DecoratedComponent, Target) as any;
}
