import "./tabs.scss";
import * as React from "react";
import { cssNames } from "../../utils";

interface Props {
  activeIndex?: number
  className?: string | object
  headerClass?: string | object
  contentClass?: string | object
  toolbarClass?: string | object
  allowUnselected?: boolean
  disabled?: boolean
  align?: "left" | "center" | "right"
  toolbar?: React.ReactNode
  onChange?(tab: TabProps): void
}

export class Tabs extends React.Component<Props, {}> {
  public header: HTMLElement;
  public content: HTMLElement;

  static defaultProps: Props = {
    activeIndex: -1,
    allowUnselected: false,
    align: "center",
  };

  get tabs() {
    return React.Children.toArray(this.props.children) as React.ReactElement<TabProps>[];
  }

  getTabByIndex(index: number) {
    var tabs = this.tabs;
    var tab = tabs.find(tab => tab.props.index === index) || tabs[index];
    if (!tab && !this.props.allowUnselected) tab = tabs[0];
    return tab ? tab.props : null;
  }

  onChange = (index: number) => {
    var { onChange, activeIndex } = this.props;
    if (index !== activeIndex && onChange) {
      var tab = this.getTabByIndex(index);
      onChange(Object.assign({ index: index }, tab));
    }
  };

  onClick = (e: React.MouseEvent<any>, index: number, tab: TabProps) => {
    this.onChange(index);
    if (tab.onClick) tab.onClick(e);
  };

  onKeyDown = (e: React.KeyboardEvent<any>, index: number, tab: TabProps) => {
    var SPACE_KEY = e.keyCode === 32;
    var ENTER_KEY = e.keyCode === 13;
    if (SPACE_KEY || ENTER_KEY) this.onChange(index);
    if (tab.onKeyDown) tab.onKeyDown(e);
  };

  render() {
    var { className, align, disabled, activeIndex, headerClass, contentClass, allowUnselected, toolbar, toolbarClass } = this.props;
    var activeTab = this.getTabByIndex(activeIndex);
    headerClass = cssNames("tabs flex", "align-" + align, {
      "tabs-header": !toolbar,
      "box grow": toolbar
    }, headerClass);
    var header = (
      <div className={headerClass} ref={e => this.header = e}>
        {this.tabs.map(({ props: tabProps }, i) => {
          var { active, disabled, title, className, index, ...tabOtherProps } = tabProps;
          if (index == null) {
            index = i;
          }
          var tabElemProps: React.HTMLProps<any> = {
            ...tabOtherProps,
            key: i,
            className: cssNames("tab", className, {
              active: active != null ? active : activeTab === tabProps,
              disabled: disabled
            }),
            tabIndex: !disabled && !active ? 0 : null,
            onKeyDown: e => this.onKeyDown(e, index, tabProps),
            onClick: e => this.onClick(e, index, tabProps),
            children: title
          };
          if (tabProps.href) {
            return <a {...tabElemProps}/>
          }
          return <div {...tabElemProps}/>;
        })}
      </div>
    )
    var toolbarHeader = toolbar ? (
      <div className={cssNames("tabs-header flex align-center", toolbarClass)}>
        {header}
        {toolbar}
      </div>
    ) : null;
    return (
      <div className={cssNames('Tabs', className, { disabled })}>
        {toolbar ? toolbarHeader : header}
        <div className={cssNames("tabs-content", contentClass)} ref={e => this.content = e}>
          {activeTab ? activeTab.children : null}
        </div>
      </div>
    );
  }
}

interface TabProps extends React.DOMAttributes<any> {
  title: string | React.ReactNode
  index?: number
  active?: boolean
  disabled?: boolean
  className?: string | object
  href?: string // render as link
}

export class Tab extends React.Component<TabProps, {}> {
  render() {
    return null;
  }
}