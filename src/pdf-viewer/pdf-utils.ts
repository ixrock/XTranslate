import { settingsStore } from "../components/settings/settings.storage";
import { useCustomPdfViewer, pdfViewerEntry, pdfViewerSkipUrlHash } from "../config";
import { getURL, ProxyResponseType } from "../extension";
import { proxyRequest } from "../background/httpProxy.bgc";

export function getPdfFileURL(raw?: boolean): string {
  const pdfUrl = new URLSearchParams(document.location.search).get("file") ?? "";
  return pdfUrl + (raw ? pdfViewerSkipUrlHash : "");
}

export function getPdfViewerURL(url: string) {
  return getURL(`${pdfViewerEntry}.html?file=${url}`);
}

export function getPdfViewerFrameURL(url: string) {
  return getURL(`assets/pdfjs/web/viewer.html?file=${url}`);
}

export async function getPdfEmbeddableURL(url: string): Promise<string> {
  const pdfFile = await proxyRequest<Blob>({
    url: url,
    responseType: ProxyResponseType.BLOB
  });

  return URL.createObjectURL(pdfFile);
}

export async function customPDFViewerRedirectCheck() {
  if (!useCustomPdfViewer()) return;

  await settingsStore.load();

  if (settingsStore.data.customPdfViewer) {
    location.replace(getPdfViewerURL(document.URL));
  }
}
