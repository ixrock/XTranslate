import type { PDFViewer } from "pdfjs-dist/types/web/pdf_viewer";

export {}

declare global {
  /* applicable only inside iframe with `viewer.html`*/
  export const PDFViewerApplication: PDFViewerApplication;

  export interface PDFViewerApplication extends PDFViewer {
    download: () => void;
  }
}
