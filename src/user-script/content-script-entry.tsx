import "../setup";
import "./content-script-entry.scss";
import { injectContentScriptAction } from "../background/scripting.bgc";

// render app
window.addEventListener("load", () => {
  window.requestAnimationFrame(() => injectContentScriptAction());
}, { once: true });
