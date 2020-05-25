// Helpers for downloading content as a file

export function downloadFile(filename: string, contents: BlobPart | BlobPart[], type: string) {
  var data = new Blob([contents].flat(), { type: type });
  var url = URL.createObjectURL(data);
  var link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const download = {
  json(filename: string, data: object, tabSize = 2) {
    downloadFile(filename, JSON.stringify(data, null, tabSize), "text/json")
  },
  csv(filename: string, rows: (string | any)[][]) {
    var wrapRequired = /[",\n]/g;
    var data = rows.map(row => {
      return row.map(rowContent => {
        if (rowContent == null) return ""
        rowContent = String(rowContent).replace(/"/g, '""');
        if (rowContent.match(wrapRequired)) {
          rowContent = `"${rowContent}"`;
        }
        return rowContent;
      }).join(",")
    }).join("\n");
    downloadFile(filename, data, "text/csv")
  },
};