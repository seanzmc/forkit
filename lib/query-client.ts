import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

/**
 * Whether a host should be reached over plain http/ws instead of https/wss.
 * Local and LAN addresses have no TLS certificate.
 */
export function isLocalHost(host: string): boolean {
  return LOCAL_HOST.test(host);
}

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:5000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error(
      'EXPO_PUBLIC_DOMAIN is not set. Set it to the API host — "localhost:5000" for local dev, or the deployed domain for a release build.',
    );
  }

  let protocol = isLocalHost(host) ? "http" : "https";
  let url = new URL(`${protocol}://${host}`);

  return url.href;
}

/**
 * Image URLs from the server are either absolute (Google photos) or paths on
 * the API host such as "/assets/dishes/pad-thai.jpg" (example dish photos).
 */
export function resolveImageUrl(uri: string): string {
  return uri.startsWith("/") ? new URL(uri.slice(1), getApiUrl()).href : uri;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
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
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
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
