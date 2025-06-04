import "../setup";
import { customPDFViewerRedirectCheck } from "../pdf-viewer/pdf-utils";
import { injectContentScriptAction } from "../background/scripting.bgc";

// handle translation in PDF-files
void customPDFViewerRedirectCheck();

// render app
window.addEventListener("load", () => {
  void injectContentScriptAction({});
});
