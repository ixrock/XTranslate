import React from "react";

export interface ImportingFile<T = string> {
  file: File;
  data: T | any;
  error?: string;
}

interface Props {
  id?: string;
  multiple?: boolean;
  onImport(data: ImportingFile[]): void;
}

export class UserHistoryImport extends React.Component<Props> {
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
        {...props}
        type="file"
        accept="application/json"
        style={this.style}
        onChange={this.onChange}
        ref={e => this.input = e}
      />
    )
  }
}
