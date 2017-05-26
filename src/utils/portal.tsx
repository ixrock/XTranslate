// Allows to render React components outside of its parent
import * as React from 'react';
import * as ReactDOM from 'react-dom';

export class Portal extends React.Component<any, any> {
  private elem: HTMLElement;

  componentDidMount() {
    this.elem = document.createElement('div');
    this.elem.className = 'portal';
    this.elem.style.position = 'absolute';
    this.elem.style.top = '0';
    this.elem.style.left = '0';
    document.body.appendChild(this.elem);
    this.renderLayer();
  }

  componentDidUpdate() {
    this.renderLayer();
  }

  componentWillUnmount() {
    ReactDOM.unmountComponentAtNode(this.elem);
    document.body.removeChild(this.elem);
  }

  renderLayer() {
    ReactDOM.unstable_renderSubtreeIntoContainer(
        this,
        this.props.children as any,
        this.elem
    );
  }

  render() {
    // Render a placeholder
    return null;
  }
}
