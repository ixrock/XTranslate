// Converts binary raw data (Blob) to other transferable formats

export function blobToBase64DataUrl(data: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(data);
    fileReader.onloadend = (evt: ProgressEvent<FileReader>) => resolve(String(fileReader.result));
    fileReader.onerror = (evt: ProgressEvent<FileReader>) => reject(null);
  });
}
