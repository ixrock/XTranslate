import "./animate.scss";
import * as React from "react";
import { autobind } from "core-decorators";
import { cssNames, noop } from "../../../utils";

interface Props {
  className?: string | object
  name?: string
  leaveTimeout?: number
  leaveCallback?: () => any
}

interface State {
  className?: string
}

export class Animate extends React.Component<Props, State> {
  public elem: HTMLElement;
  private canUpdate = true;
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
    if (this.canUpdate) {
      this.setState({ className: Animate.ENTER });
    }
  }

  @autobind()
  leave() {
    if (this.canUpdate) {
      this.setState({ className: Animate.LEAVE });
    }
    else {
      this.props.leaveCallback();
    }
  }

  componentDidMount() {
    setTimeout(this.enter, 50);
    if (this.props.leaveTimeout) setTimeout(this.leave, this.props.leaveTimeout);
    this.elem.addEventListener('transitionend', this.onTransitionEnd, false);
  }

  @autobind()
  onTransitionEnd() {
    if (!this.elem) return;
    var classList = this.elem.classList;
    if (classList.contains(Animate.ENTER) && this.canUpdate) {
      this.setState({
        className: cssNames(Animate.ENTER, Animate.ACTIVE)
      });
    }
    if (classList.contains(Animate.LEAVE)) {
      this.props.leaveCallback();
    }
  }

  componentWillUnmount() {
    this.canUpdate = false;
  }

  render() {
    var { className, name, children } = this.props;
    className = cssNames(className, "Animate", name, this.state.className);
    return (
      <div className={className} ref={e => this.elem = e}>
        {children}
      </div>
    );
  }
}
