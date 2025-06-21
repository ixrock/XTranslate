import * as styles from "./sub-title.module.scss"
import React from "react"
import { cssNames } from "@/utils";

export interface Props extends React.HTMLProps<HTMLHeadingElement> {
}

export class SubTitle extends React.Component<Props> {
  render() {
    const { className, children, ...elemProps } = this.props;
    const headerClass = cssNames(styles.SubTitle, className);

    return (
      <h3 className={headerClass} {...elemProps}>
        {children}
      </h3>
    )
  }
}