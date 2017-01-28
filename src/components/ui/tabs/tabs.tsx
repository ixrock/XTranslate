require('./tabs.scss');
import * as React from 'react'
import { cssNames } from "../../../utils";

interface Props {
  activeIndex?: number
  className?: any
  headerClass?: any
  contentClass?: any
  allowUnselected?: boolean
  disabled?: boolean
  onChange?(tab: TabProps): void
}

export class Tabs extends React.Component<Props, {}> {
  public header: HTMLElement;
  public content: HTMLElement;

  onChange = (index: number) => {
    var { onChange, activeIndex } = this.props;
    if (index !== activeIndex && onChange) {
      var tabs = this.tabs;
      var tab = tabs.filter(tab => tab.props.index === index)[0] || tabs[index];
      onChange(Object.assign({ index: index }, tab.props));
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

  get tabs() {
    return React.Children.toArray(this.props.children) as React.ReactElement<TabProps>[];
  }

  render() {
    var { className, disabled, activeIndex, headerClass, contentClass, allowUnselected, onChange, ...props } = this.props;
    var componentClass = cssNames('Tabs', className, { disabled });
    var activeTabIndex = this.tabs[activeIndex] ? activeIndex : (!allowUnselected ? 0 : null);
    var activeTab = this.tabs[activeTabIndex] ? this.tabs[activeTabIndex].props : {} as TabProps;
    return (
        <div {...props} className={componentClass}>
          <div className={cssNames("tabs-header flex justify-center", headerClass)} ref={e => this.header = e}>
            {this.tabs.map((tab, i) => {
              var { active, disabled, title, className, index, ...tabProps } = tab.props;
              if (index == null) index = i;
              var tabClass = cssNames("tab", className, {
                active: active != null ? active : activeTabIndex === index,
                disabled: disabled
              });
              var Component = props => tabProps.href ? <a {...props}/> : <div {...props}/>;
              return (
                  <Component key={tab.key} {...tabProps} className={tabClass}
                       tabIndex={!disabled && !active ? 0 : null}
                       onKeyDown={e => this.onKeyDown(e, index, tab.props)}
                       onClick={e => this.onClick(e, index, tab.props)}>
                    {title}
                  </Component>
              )
            })}
          </div>
          <div className={cssNames("tabs-content", contentClass)} ref={e => this.content = e}>
            {activeTab.children}
          </div>
        </div>
    );
  }
}

interface TabProps extends React.HTMLProps<any> {
  title: any
  index?: number
  active?: boolean
  disabled?: boolean
}

export class Tab extends React.Component<TabProps, {}> {
  render() {
    return null;
  }
}