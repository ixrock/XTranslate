import React, { InputHTMLAttributes } from "react";

export interface ImportingFile<T = string> {
  file: File;
  data: T | any;
  error?: string;
}

interface Props extends InputHTMLAttributes<any> {
  id?: string; // could be used with <label htmlFor={id}/> to open filesystem dialog
  accept?: string; // allowed file types to select, e.g. "application/json"
  multiple?: boolean;
  onImport(data: ImportingFile[]): void;
}

export class FileInput extends React.Component<Props> {
  protected input: HTMLInputElement;

  protected style: React.CSSProperties = {
    position: "absolute",
    display: "none",
  };

  selectFiles = () => {
    this.input.click();
  }

  protected onChange = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    var fileList = Array.from(evt.target.files);
    if (!fileList.length) {
      return;
    }
    var readingFiles: Promise<ImportingFile>[] = fileList.map(file => {
      return new Promise((resolve) => {
        var reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            file: file,
            data: reader.result,
            error: reader.error ? String(reader.error) : null,
          })
        };
        reader.readAsText(file);
      })
    });
    var data = await Promise.all(readingFiles);
    this.props.onImport(data);
  }

  render() {
    var { onImport, ...props } = this.props;
    return (
      <input
        type="file"
        style={this.style}
        onChange={this.onChange}
        ref={e => this.input = e}
        {...props}
      />
    )
  }
}
