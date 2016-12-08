require('./tabs.scss');
import * as React from 'react'
import { cssNames } from "../../../utils";
import omit = require("lodash/omit");
import findIndex = require("lodash/findIndex");

interface Props {
  className?: any
  activeTab?: number
  headerClass?: any
  contentClass?: any
  onChange?(activeTab: ActiveTab): void
  children?: TabElement[]
}

interface ActiveTab {
  title: string
  index: number
}


export class Tabs extends React.Component<Props, {}> {
  public state = {
    activeTab: this.tabs[this.props.activeTab]
        ? this.props.activeTab
        : Math.max(0, findIndex(this.tabs, { props: { active: true } }))
  };

  get tabs() {
    return React.Children.toArray(this.props.children) as TabElement[];
  }

  get activeTab() {
    var activeIndex = this.state.activeTab;
    var tab = this.tabs[activeIndex];
    return {
      title: tab.props.title,
      index: activeIndex
    }
  }

  selectTab(index: number) {
    if (!this.tabs[index]) return;
    this.setState({ activeTab: index }, () => {
      if (this.props.onChange) this.props.onChange(this.activeTab);
    });
  }

  render() {
    var props = omit(this.props, ['className', 'activeTab', 'onChange', 'headerClass', 'contentClass']);
    var activeIndex = this.state.activeTab;
    var activeTab = this.tabs[activeIndex];
    return (
        <div className={cssNames('Tabs', this.props.className)} {...props}>
          <div className={cssNames("tabs-header flex gaps justify-center", this.props.headerClass)}>
            {this.tabs.map((tab, i) => {
              var tabProps: TabProps = omit(tab.props, ['title', 'active']);
              var className = cssNames('tab', tabProps.className, { active: i === activeIndex });
              var onClick = (e) => {
                this.selectTab(i);
                if (tabProps.onClick) tabProps.onClick(e);
              };
              var Component = props => tabProps.href ? <a {...props}/> : <div {...props}/>;
              return (
                  <Component key={i} {...tabProps} className={className} onClick={onClick}>
                    {tab.props.title}
                  </Component>
              );
            })}
          </div>
          <div className={cssNames("tabs-content", this.props.contentClass)} key={activeTab.key}>
            {activeTab.props.children}
          </div>
        </div>
    );
  }
}

type TabElement = React.ReactElement<TabProps>;

interface TabProps extends React.HTMLProps<any> {
  title?: string
  active?: boolean
}

export class Tab extends React.Component<TabProps, {}> {
  render() {
    return null;
  }
}