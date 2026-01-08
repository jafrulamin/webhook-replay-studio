const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8787";

interface FetchApiOptions {
  method: string;
  body: string;
  headers: Record<string, string>;
}

async function fetchApi<T>(endpoint: string, options: Partial<FetchApiOptions> | undefined = undefined): Promise<T> {
  let url = `${API_BASE}${endpoint}`;
  if (endpoint.startsWith("http")) {
    url = endpoint;
  }

  let requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options && options.headers) {
    requestHeaders = { ...requestHeaders, ...options.headers };
  }

  const fetchOptions: RequestInit = {
    headers: requestHeaders,
  };
  if (options && options.method) {
    fetchOptions.method = options.method;
  }
  if (options && options.body) {
    fetchOptions.body = options.body;
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    let errorData: { error: string } = { error: "Unknown error" };
    try {
      errorData = await response.json();
    } catch {
      // Use default error
    }
    let errorMessage = `HTTP ${response.status}`;
    if (errorData.error) {
      errorMessage = errorData.error;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export { fetchApi, API_BASE };
