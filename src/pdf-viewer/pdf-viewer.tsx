// Custom PDF-file viewer based on official mozilla pdf.js library
// Read more: https://mozilla.github.io/pdf.js/

import "../setup"
import React from "react";
import { createRoot } from "react-dom/client"
import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { getPdfEmbeddableURL, getPdfFileURL, getPdfViewerFrameURL } from "./pdf-utils";
import { ContentScript } from "../user-script/content-script";
import { themeStore } from "../components/theme-manager/theme.storage";
import ChromeIcon from "./chrome.svg";

@observer
export class PdfViewer extends React.Component {
  @observable pdfUrl = "";
  @observable isPdfReady = false;
  @observable.ref iframe: HTMLIFrameElement;

  static async init() {
    const rootElem = document.createElement('div');
    rootElem.id = "XTranslatePdfViewer";
    document.body.appendChild(rootElem);

    // render content
    const rootNode = createRoot(rootElem);
    rootNode.render(<PdfViewer/>);
  }

  constructor(props: React.PropsWithChildren) {
    super(props);
    makeObservable(this);
    void this.preloadPdf();
  }

  private onPdfViewerReady = action(() => {
    this.isPdfReady = true;
    this.autoPopulateDocumentFontsToFrame();
    void this.bindContentScript();
    void this.correctPdfDownloadFilename();
    void this.addChromeNativePdfViewerIconButton();
  });

  get pdfDocument(): Document {
    return this.iframe.contentWindow.document;
  }

  get pdfViewer(): PDFViewerApplication {
    return (this.iframe.contentWindow as any).PDFViewerApplication as PDFViewerApplication;
  }

  private async addChromeNativePdfViewerIconButton() {
    try {
      const rightToolbarElem = this.pdfDocument.getElementById("toolbarViewerRight");
      const iconBtn = this.pdfDocument.createElement("img");
      iconBtn.src = ChromeIcon; // data:image/svg+xml;base64,***
      iconBtn.title = "Open in browser's native PDF viewer";
      iconBtn.onclick = () => window.open(getPdfFileURL(true), "_blank");
      iconBtn.classList.add("toolbarButton");
      iconBtn.style.padding = "5px";
      iconBtn.style.height = "28px";
      rightToolbarElem.prepend(iconBtn);
    } catch (err) {
      console.error("Failed to add Chrome native PDF viewer button", err);
    }
  }

  private async correctPdfDownloadFilename() {
    this.pdfViewer.download = async () => {
      const pdfFile = await this.pdfViewer.pdfDocument.getData();
      this.pdfViewer.downloadManager.download(
        pdfFile, getPdfFileURL(), this.fileName
      )
    };
  }

  private async bindContentScript() {
    await ContentScript.init(this.iframe.contentWindow as Window);
  };

  private autoPopulateDocumentFontsToFrame() {
    const addFont = (font: FontFace) => this.iframe.contentDocument.fonts.add(font);
    Array.from(document.fonts).forEach(addFont);
    return themeStore.events.on("fontLoaded", addFont);
  }

  get fileName(): string {
    return getPdfFileURL().split("/").slice(-1)[0];
  }

  @action
  async preloadPdf() {
    const remotePDF = getPdfFileURL(); // e.g. https://example.com/file.pdf or file://path/to/file.pdf
    if (!remotePDF) return;
    document.title = `PDF-viewer: ${this.fileName}`;
    this.pdfUrl = await getPdfEmbeddableURL(remotePDF); // e.g. `blob:chrome-extension://***/1234-5678-90ab-cdef`
  }

  @action.bound
  bindRef(elem: HTMLIFrameElement) {
    this.iframe = elem;
  }

  render() {
    if (!this.pdfUrl) return;
    const pdfViewerFrameURL = getPdfViewerFrameURL(this.pdfUrl);

    return (
      <iframe
        src={pdfViewerFrameURL}
        onLoad={this.onPdfViewerReady}
        ref={this.bindRef}
        style={{
          position: "absolute",
          left: 0, top: 0,
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
        }}
      />
    );
  }
}

PdfViewer.init();
