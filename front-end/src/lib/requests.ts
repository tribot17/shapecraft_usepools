async function createFetchRequest(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

function buildHeaders(authorization: string) {
  const headers = {
    "Content-Type": "application/json",
    authorization,
  };

  return headers;
}

async function buildRequest(
  url: string,
  data: object,
  method: string,
  token: string = ""
) {
  const headers = buildHeaders(token);
  const body = data ? JSON.stringify(data) : undefined;

  return createFetchRequest(url, { method, headers, body });
}

async function executeRequest(
  url: string,
  data: object | null,
  method: string,
  authorization: string = ""
) {
  const headers = buildHeaders(authorization);
  const body = data ? JSON.stringify(data) : undefined;
  return await createFetchRequest(url, { method, headers, body });
}

export { buildRequest, executeRequest };
