// Converts binary raw data (Blob) to other transferable formats

export async function blobToBase64DataUrl(data: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(data);
    fileReader.onloadend = (evt: ProgressEvent<FileReader>) => resolve(String(fileReader.result));
    fileReader.onerror = (evt: ProgressEvent<FileReader>) => reject(null);
  });
}

export function toBinaryFile(data: Uint8Array | number[], contentType = "text/plain"): Blob {
  const arrayBuffer = Uint8Array.from(data).buffer;

  return new Blob([arrayBuffer], {
    type: contentType,
  });
}
