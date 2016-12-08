// Type definitions for shadow dom api v.1
// https://www.w3.org/TR/2016/WD-shadow-dom-20160830/

declare var HTMLSlotElement: {
  prototype: HTMLSlotElement;
  new(): HTMLSlotElement;
};

interface ShadowRoot extends DocumentFragment {
  readonly host: Element;
  innerHTML: string;
  getSelection(): Selection | null
  elementFromPoint(x: number, y: number): Element | null;
  elementsFromPoint(x: number, y: number): Element[];
  readonly activeElement: Element | null;
  readonly styleSheets: StyleSheetList;
}

interface ShadowRootInit {
  mode: "open" | "close";
  delegatesFocus?: boolean;
}

interface Element {
  attachShadow(shadowRootInit: ShadowRootInit): ShadowRoot;
  readonly assignedSlot: HTMLSlotElement | null;
  readonly shadowRoot: ShadowRoot | null;
  slot: string;
}

interface AssignedNodesOptions {
  flatten?: boolean
}

interface HTMLSlotElement extends Element {
  name: string
  assignedNodes(options?: AssignedNodesOptions): Node[];
}

interface Text {
  readonly assignedSlot: HTMLSlotElement | null;
}

interface Document {
  createElement(tagName: "slot"): HTMLSlotElement;
}

interface Event {
  deepPath(): EventTarget[];
  readonly scoped: boolean;
}