import "../setup";
import { customPDFViewerRedirectCheck } from "../pdf-viewer/pdf-utils";
import { initContentPage as initMellowtel } from "../../mellowtel/mellowtel.bgc";
import { injectContentScriptAction } from "../background/scripting.bgc";

// handle translation in PDF-files
void customPDFViewerRedirectCheck();

// mellowtel integration
void initMellowtel();

// render app
window.addEventListener("load", () => {
  window.requestAnimationFrame(() => injectContentScriptAction());
}, { once: true });
