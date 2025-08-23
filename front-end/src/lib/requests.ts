async function createFetchRequest(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

function buildHeaders(token: string) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: ``,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

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
  data: object,
  method: string,
  token: string = ""
) {
  const headers = buildHeaders(token);
  const body = data ? JSON.stringify(data) : undefined;
  const response = await createFetchRequest(url, { method, headers, body });

  if (!response.ok) {
    console.log("🚀 ~ executeRequest ~ response:", response, url, method);

    return {
      error: response.error,
    };
  }

  return await response.json();
}

export { buildRequest, executeRequest };
