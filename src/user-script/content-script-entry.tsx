import "../setup";
import "./content-script-entry.scss";
import { customPDFViewerRedirectCheck } from "../pdf-viewer/pdf-utils";
import { injectContentScriptAction } from "../background/scripting.bgc";

// handle translation in PDF-files
void customPDFViewerRedirectCheck();

// render app
void injectContentScriptAction({});
