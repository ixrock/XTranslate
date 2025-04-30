import "../setup";
import { ContentScript } from "./content-script";
import { customPDFViewerRedirectCheck } from "../pdf-viewer/pdf-utils";
import { initContentPage as initMellowtel } from "../../mellowtel/mellowtel.bgc";
import { mellowtelMeucciFilename } from "../../mellowtel/mellowtel.config";

// handle translation in PDF-files
void customPDFViewerRedirectCheck();

// mellowtel integration
void initMellowtel({
  meucciFilePath: `${mellowtelMeucciFilename}.js`, // TODO: comment out for new CWS release
});

// render app
ContentScript.start();

import "../../refs";
