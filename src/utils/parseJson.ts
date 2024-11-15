// Parse json response

export interface JsonResponseError {
  statusCode: number; // http response code (e.g. 400)
  message: string; // error explanation
}

export async function parseJson(res: Response): Promise<any> {
  try {
    var data = await res.json();
    if (res.ok) return data; // status-code >= 200 < 300
    else {
      throw data; // json-error
    }
  } catch (error) {
    const jsonError: JsonResponseError = {
      statusCode: res.status,
      message: res.statusText || String(error),
    };
    // extend with error message from json-response
    if (typeof error == "object" && !(error instanceof Error)) {
      Object.assign(jsonError, error);
    }
    throw jsonError;
  }
}
