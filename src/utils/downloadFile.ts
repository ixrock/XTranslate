// Helpers for downloading some content as file

export function downloadFile(filename: string, contents: any, type: string) {
  var data = new Blob([contents], { type: type });
  var url = URL.createObjectURL(data);
  var link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const download = {
  csv(filename: string, dataRows: (string | number)[][]){
    var wrappingContentRequired = /[";\n]/g;
    var data = dataRows.map(row => {
      return row.map(item => {
        item = item.toString().replace(/"/g, '""');
        if (item.match(wrappingContentRequired)) item = `"${item}"`
        return item;
      }).join(";")
    }).join("\n");
    downloadFile(filename, data, "text/csv")
  },

  json(filename: string, data: object, tabSize = 2) {
    downloadFile(filename, JSON.stringify(data, null, tabSize), "text/json")
  }
};