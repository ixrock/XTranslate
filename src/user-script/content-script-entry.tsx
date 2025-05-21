import "../setup";
import { customPDFViewerRedirectCheck } from "../pdf-viewer/pdf-utils";
import { initContentPage as initMellowtel } from "../../mellowtel/mellowtel.bgc";
import { mellowtelMeucciFilename } from "../../mellowtel/mellowtel.config";
import { injectContentScript } from "../background/scripting.bgc";

// handle translation in PDF-files
void customPDFViewerRedirectCheck();

// mellowtel integration
void initMellowtel({
  meucciFilePath: `${mellowtelMeucciFilename}.js`,
});

// render app
await injectContentScript();
