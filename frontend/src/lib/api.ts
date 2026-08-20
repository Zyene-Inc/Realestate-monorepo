const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null);
    const message =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : "API request failed";
    throw new Error(message);
  }

  return response.json();
}

export const api = {
  get: (endpoint: string) => apiFetch(endpoint, { method: "GET" }),
  post: (endpoint: string, body: unknown) =>
    apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) }),
  patch: (endpoint: string, body: unknown) =>
    apiFetch(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (endpoint: string) => apiFetch(endpoint, { method: "DELETE" }),
};
