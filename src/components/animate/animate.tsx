import "./animate.scss";
import * as React from "react";
import { action, makeObservable, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { autoBind, cssNames, noop } from "../../utils";

export type AnimateName = "opacity" | "slide-right" | "opacity-scale"; // predefined classnames in css

export interface AnimateProps {
  name?: AnimateName;
  enter?: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
}

@observer
export class Animate extends React.Component<AnimateProps> {
  static defaultProps: AnimateProps = {
    name: "opacity",
    enter: true,
    onEnter: noop,
    onLeave: noop,
  };

  constructor(props: AnimateProps) {
    super(props);
    makeObservable(this);
    autoBind(this);

    disposeOnUnmount(this, [
      reaction(() => this.props.enter, this.toggle, {
        fireImmediately: true,
      })
    ]);
  }

  @observable isVisible = Boolean(this.props.enter);
  @observable className = { enter: false, leave: false };

  get contentElem(): React.ReactElement<React.HTMLProps<any>> {
    return React.Children.only(this.props.children) as React.ReactElement;
  }

  toggle(enter?: boolean) {
    if (enter) this.enter();
    else this.leave();
  }

  @action
  enter() {
    this.isVisible = true; // triggers render() to apply css-animation in existing dom
    this.className.leave = false;

    requestAnimationFrame(() => {
      this.className.enter = true;
      this.props.onEnter();
    });
  }

  @action
  leave() {
    if (!this.isVisible) return;
    this.className.leave = true;
    this.props.onLeave();
  }

  @action
  reset() {
    this.isVisible = false;
    this.className.enter = false;
    this.className.leave = false;
  }

  onTransitionEnd(evt: React.TransitionEvent) {
    var { enter, leave } = this.className;
    var { onTransitionEnd } = this.contentElem.props;
    if (onTransitionEnd) onTransitionEnd(evt);
    if (enter && leave) {
      this.reset();
    }
  }

  render() {
    var { contentElem, isVisible, className } = this;
    if (!isVisible && !className.leave) {
      return null;
    }

    return React.cloneElement(contentElem, {
      className: cssNames("Animate", this.props.name, contentElem.props.className, className),
      children: contentElem.props.children,
      onTransitionEnd: this.onTransitionEnd,
    });
  }
}
