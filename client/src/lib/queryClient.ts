import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// In-memory CSRF token cache — never stored in a JS-readable cookie.
// The server sets an HttpOnly cookie and also returns the value via
// /api/csrf-token so the client can include it as a request header.
let _csrfCache: string | null = null;
let _csrfPending: Promise<string | null> | null = null;

function _fetchCsrfToken(): Promise<string | null> {
  if (_csrfCache !== null) return Promise.resolve(_csrfCache);
  if (_csrfPending) return _csrfPending;

  _csrfPending = fetch("/api/csrf-token", { credentials: "include" })
    .then((res) => (res.ok ? res.json() : { token: null }))
    .then((data: { token?: string }) => {
      _csrfCache = data.token ?? null;
      _csrfPending = null;
      return _csrfCache;
    })
    .catch(() => {
      _csrfPending = null;
      return null;
    });

  return _csrfPending;
}

// Pre-fetch on module load so the token is ready before the first mutation.
_fetchCsrfToken();

export async function getCsrfToken(): Promise<string | null> {
  return _fetchCsrfToken();
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    const csrfToken = await getCsrfToken();
    if (csrfToken) headers["x-csrf-token"] = csrfToken;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
