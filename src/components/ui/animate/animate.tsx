import "./animate.scss";
import * as React from "react";
import { autobind } from "core-decorators";
import { cssNames, noop } from "../../../utils";

interface Props {
  className?: string | object
  name?: string
  leaveTimeout?: number
  leaveCallback?: () => void
}

interface State {
  className?: string
}

export class Animate extends React.Component<Props, State> {
  public elem: HTMLElement;
  public state: State = {};

  static ENTER = "enter";
  static LEAVE = "leave";
  static ACTIVE = "active";

  static defaultProps = {
    name: "opacity",
    leaveTimeout: 0,
    leaveCallback: noop
  };

  @autobind()
  enter() {
    this.setState({ className: Animate.ENTER });
  }

  @autobind()
  leave() {
    this.setState({ className: Animate.LEAVE });
  }

  componentDidMount() {
    setTimeout(this.enter, 25);
    if (this.props.leaveTimeout) {
      setTimeout(this.leave, this.props.leaveTimeout);
    }
  }

  @autobind()
  onTransitionEnd(evt: React.TransitionEvent) {
    var classNames = this.state.className.split(" ");
    if (classNames.find(c => c === Animate.ENTER)) {
      this.setState({
        className: cssNames(Animate.ENTER, Animate.ACTIVE)
      });
    }
    else if (classNames.find(c => c === Animate.LEAVE)) {
      this.props.leaveCallback();
    }
  }

  render() {
    var { className, name, children } = this.props;
    className = cssNames(className, "Animate", name, this.state.className);
    return (
      <div className={className} onTransitionEnd={this.onTransitionEnd} ref={e => this.elem = e}>
        {children}
      </div>
    );
  }
}
