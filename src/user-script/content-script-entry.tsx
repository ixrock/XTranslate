// TODO: get back `refs.ts`
import "../setup";
import { settingsStore } from "../components/settings/settings.storage";
import { ContentScript } from "./content-script";
import { delay } from "../utils";
import { isPdf } from "../common-vars";
import { getPdfViewerURL } from "../pdf-viewer/pdf-utils";

// handle translation in PDF-files
if (isPdf()) {
  await settingsStore.load();
  if (settingsStore.data.customPdfViewer) {
    location.replace(getPdfViewerURL(document.URL));
  }
}

// mellowtel integration
// import { initContentPage as initMellowtel } from "../../mellowtel/mellowtel.bgc";
// void initMellowtel();

// fix: wait for 1 second to avoid possible react.js error: https://react.dev/errors/418
// that might happen in case of server-side-rendering at resource backend
// reproducible at the moment at https://chatgpt.com/
await delay(1000);

// render app
void ContentScript.init();
