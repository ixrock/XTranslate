// Custom PDF-file viewer based on official mozilla pdf.js library
// Read more: https://mozilla.github.io/pdf.js/

import "../setup"
import React from "react";
import { createRoot } from "react-dom/client"
import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { getPdfEmbeddableURL, getPdfRemoteURL, getPdfViewerFrameURL } from "./pdf-utils";
import { ContentScript } from "../user-script/content-script";
import { themeStore } from "../components/theme-manager/theme.storage";
import type { PDFViewer } from "pdfjs-dist/types/web/pdf_viewer"

@observer
export class PdfViewer extends React.Component {
  @observable pdfUrl = "";
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
    this.autoPopulateFrameFonts();
    void this.preloadPdf();
  }

  private onPdfViewerReady = () => {
    this.customizePdfViewer();
    void this.bindContentScript();
  }

  get pdfViewer(): PDFViewer & { download: () => void } {
    return (this.iframe.contentWindow as any).PDFViewerApplication;
  }

  private customizePdfViewer() {
    this.pdfViewer.download = async () => {
      const pdfFile = await this.pdfViewer.pdfDocument.getData();
      this.pdfViewer.downloadManager.download(
        pdfFile, getPdfRemoteURL(), this.fileName
      )
    };
  }

  private async bindContentScript() {
    await ContentScript.init(this.iframe.contentWindow as Window);
  };

  private autoPopulateFrameFonts() {
    return themeStore.events.on("fontLoaded", font => this.iframe.contentDocument.fonts.add(font));
  }

  get fileName(): string {
    return getPdfRemoteURL().split("/").slice(-1)[0];
  }

  @action
  async preloadPdf() {
    const remotePDF = getPdfRemoteURL(); // e.g. https://example.com/file.pdf or file://path/to/file.pdf
    if (!remotePDF) return;
    document.title = `PDF-viewer: ${this.fileName}`;
    // TODO: customize toolbar of PDF-viewer and add button for opening in native PDF-viewer (blob:/*)
    this.pdfUrl = await getPdfEmbeddableURL(remotePDF);
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
