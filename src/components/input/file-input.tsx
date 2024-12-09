import React, { InputHTMLAttributes } from "react";

export interface ImportingFile<DataType = void> {
  file: File; // selected file by user
  data?: DataType;
  error?: string;
}

export type OutputFileType = "buffer" | "data-url" | "text";

interface Props<DataType = string> extends InputHTMLAttributes<any> {
  /**
   * Could be used with <label htmlFor={id}/> to open filesystem dialog.
   * Otherwise recommended usage for opening files dialog:
   * let fileInput: FileInput;
   * <FileInput ref={e => fileInput = e}>
   * <button onClick={() => fileInput.selectFiles()}>Open files</button>
   */
  id?: string;
  accept?: string; // allowed file types to select, e.g. "application/json"
  multiple?: boolean;
  outputType?: OutputFileType;
  onImport(data: ImportingFile<DataType>[]): void;
}

export class FileInput<DataType = void> extends React.Component<Props<DataType>> {
  protected input: HTMLInputElement;

  protected style: React.CSSProperties = {
    position: "absolute",
    display: "none",
  };

  /**
   * Opens select-file dialog.
   * Should be attached to user's event-click or similar event when used.
   */
  selectFiles = () => this.input.click();

  protected onChange = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const { outputType } = this.props;

    const fileList = Array.from(evt.target.files);
    if (!fileList.length) {
      return;
    }

    if (outputType) {
      const readingFiles: Promise<ImportingFile<DataType>>[] = fileList.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              file: file,
              data: reader.result as DataType,
              error: reader.error ? String(reader.error) : null,
            })
          };

          if (outputType === "buffer") reader.readAsArrayBuffer(file);
          else if (outputType === "data-url") reader.readAsDataURL(file);
          else if (outputType === "text") reader.readAsText(file);
        })
      });

      const importedFiles = await Promise.all(readingFiles);
      this.props.onImport(importedFiles);
    } else {
      this.props.onImport(fileList.map(file => ({ file })));
    }
  }

  render() {
    const { onImport, outputType, ...props } = this.props;
    return (
      <input
        {...props}
        type="file"
        style={this.style}
        onChange={this.onChange}
        ref={e => {
          this.input = e
        }}
      />
    )
  }
}
