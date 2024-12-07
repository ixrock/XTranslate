import { settingsStore } from "../components/settings/settings.storage";
import { getURL, proxyRequest, ProxyResponseType } from "../extension";
import { isPdf, pdfViewerEntry } from "../common-vars";

export function getPdfRemoteURL(): string {
  return new URLSearchParams(document.location.search).get("file") ?? "";
}

export function getPdfViewerURL(url: string) {
  return getURL(`${pdfViewerEntry}.html?file=${encodeURIComponent(url)}`);
}

export function getPdfViewerFrameURL(url: string) {
  return getURL(`assets/pdfjs/web/viewer.html?file=${encodeURIComponent(url)}`);
}

export async function getPdfEmbeddableURL(url: string): Promise<string> {
  const pdfFile = await proxyRequest<Blob>({
    url: url,
    responseType: ProxyResponseType.BLOB
  });

  return URL.createObjectURL(pdfFile);
}

export async function customPDFViewerRedirectCheck() {
  if (!isPdf()) {
    return;
  }
  await settingsStore.load();

  if (settingsStore.data.customPdfViewer) {
    location.replace(getPdfViewerURL(document.URL));
  }
}
