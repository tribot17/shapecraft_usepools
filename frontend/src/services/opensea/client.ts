export class OpenSeaClient {
  private static instance: OpenSeaClient;
  static apiURL = "https://api.opensea.io/api/v2/";

  static getInstance(): OpenSeaClient {
    if (!OpenSeaClient.instance) {
      OpenSeaClient.instance = new OpenSeaClient();
    }
    return OpenSeaClient.instance;
  }

  async createOpenseaRequest(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    params: Record<string, string>
  ) {
    const url = new URL(`${OpenSeaClient.apiURL}${endpoint}`);

    if (method === "GET" && Object.keys(params).length > 0) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "x-api-key": process.env.OPENSEA_API_KEY || "",
        "Content-Type": "application/json",
      },
    };

    if (method !== "GET" && Object.keys(params).length > 0) {
      fetchOptions.body = JSON.stringify(params);
    }

    const response = await fetch(url.toString(), fetchOptions);
    return response.json();
  }

  async getCollection(collectionSlug: string) {
    return await this.createOpenseaRequest(
      `collections/${collectionSlug}`,
      "GET",
      {}
    );
  }
}
