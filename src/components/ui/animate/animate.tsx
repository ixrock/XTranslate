require('./animate.scss');
import * as React from 'react'
import { autobind } from "core-decorators";
import { cssNames } from "../../../utils";

interface Props {
  className?: string
  name?: string
  leaveTimeout?: number
  leaveCallback?: () => any
}

export class Animate extends React.Component<Props, {}> {
  public elem: HTMLElement;
  private canUpdate = true;
  public state = { className: "" };

  static CLASS_NAMES = {
    ENTER: "enter",
    LEAVE: "leave",
    ACTIVE: "active"
  };

  static NAMES = {
    OPACITY: "opacity",
    DROP_DOWN: "drop-down"
  };

  static defaultProps = {
    name: Animate.NAMES.OPACITY,
    leaveTimeout: 0,
    leaveCallback() {}
  };

  @autobind()
  enter() {
    if (this.canUpdate) {
      this.setState({ className: Animate.CLASS_NAMES.ENTER });
    }
  }

  @autobind()
  leave() {
    if (this.canUpdate) {
      this.setState({ className: Animate.CLASS_NAMES.LEAVE });
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
    var classList = this.elem.classList;
    if (classList.contains(Animate.CLASS_NAMES.ENTER) && this.canUpdate) {
      this.setState({
        className: cssNames(Animate.CLASS_NAMES.ENTER, Animate.CLASS_NAMES.ACTIVE)
      });
    }
    if (classList.contains(Animate.CLASS_NAMES.LEAVE)) {
      this.props.leaveCallback();
    }
  }

  componentWillUnmount() {
    this.canUpdate = false;
  }

  render() {
    var className = cssNames("animate",
        this.props.name,
        this.props.className,
        this.state.className
    );
    return (
        <div className={className} ref={e => this.elem = e}>
          {this.props.children}
        </div>
    );
  }
}

export default Animate;