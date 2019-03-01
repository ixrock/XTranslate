import "./animate.scss";
import * as React from "react";
import { autobind, cssNames, noop } from "../../utils";

interface Props {
  name?: string
  className?: string
  enter?: boolean
  onEnter?: () => void;
  onLeave?: () => void;
}

interface State {
  enter?: boolean
  leave?: boolean
}

export class Animate extends React.PureComponent<Props, State> {
  static defaultProps = {
    name: "opacity",
    enter: true,
    onEnter: noop,
    onLeave: noop,
  };

  public state: State = {}

  componentDidMount() {
    if (this.props.enter) this.enter();
  }

  componentWillReceiveProps(nextProps: Props) {
    if (this.props.enter !== nextProps.enter) {
      if (nextProps.enter) setTimeout(() => this.enter(), 25);
      else this.leave();
    }
  }

  enter() {
    this.props.onEnter();
    this.setState({ enter: true, leave: false });
  }

  leave() {
    this.props.onLeave();
    this.setState({ leave: true, enter: false });
  }

  get contentElem() {
    return React.Children.only(this.props.children) as React.ReactElement<React.HTMLAttributes<any>>;
  }

  @autobind()
  onTransitionEnd(evt: React.TransitionEvent) {
    var { onTransitionEnd } = this.contentElem.props;
    if (onTransitionEnd) onTransitionEnd(evt);
    if (this.state.leave) this.setState({ leave: false });
  }

  render() {
    var { className, name, enter } = this.props;
    var contentElem = this.contentElem;
    var contentProps: React.HTMLAttributes<any> = {
      className: cssNames(
        contentElem.props.className, className,
        "Animate", name, this.state,
      ),
      children: enter || this.state.leave ? contentElem.props.children : null,
      onTransitionEnd: this.onTransitionEnd,
    };
    return React.cloneElement(contentElem, contentProps);
  }
}
