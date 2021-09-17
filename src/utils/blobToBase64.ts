// Converts binary data (blob) to base64 string

export function blobToBase64(data: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(data);
    fileReader.onloadend = (evt: ProgressEvent<FileReader>) => resolve(String(fileReader.result));
    fileReader.onerror = (evt: ProgressEvent<FileReader>) => reject(null);
  });
}
