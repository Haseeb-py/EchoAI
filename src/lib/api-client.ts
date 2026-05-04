type ApiErrorPayload = { message?: string; error?: string };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function buildUrl(path: string) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

async function parseError(response: Response) {
  try {
    const body = (await response.json()) as ApiErrorPayload;
    return body.message || body.error || `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  if (response.ok) {
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  throw new Error(await parseError(response));
}

export function apiGet<T>(path: string, token?: string | null) {
  return apiRequest<T>(path, { method: "GET" }, token);
}

export function apiPost<T>(path: string, payload?: object, token?: string | null) {
  return apiRequest<T>(path, {
    method: "POST",
    body: payload ? JSON.stringify(payload) : undefined,
  }, token);
}

export function apiPut<T>(path: string, payload?: object, token?: string | null) {
  return apiRequest<T>(path, {
    method: "PUT",
    body: payload ? JSON.stringify(payload) : undefined,
  }, token);
}

export function apiDelete<T>(path: string, token?: string | null) {
  return apiRequest<T>(path, { method: "DELETE" }, token);
}
