import { afterAll } from "bun:test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

/**
 * Simple cookie jar to persist cookies between requests.
 * Node.js/Bun fetch doesn't persist cookies automatically like browsers do.
 */
class CookieJar {
  private cookies: Map<string, string> = new Map();

  setCookie(setCookieHeader: string): void {
    // Set-Cookie format: "name=value; Path=/; HttpOnly; Secure"
    // We only care about the name=value part before the first semicolon
    const parts = setCookieHeader.split(';');
    const nameValue = parts[0].trim();

    const eqIndex = nameValue.indexOf('=');
    if (eqIndex > 0) {
      const name = nameValue.substring(0, eqIndex).trim();
      const value = nameValue.substring(eqIndex + 1).trim();
      this.cookies.set(name, value);
    }
  }

  getCookieHeader(): string | undefined {
    const cookies = Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
    return cookies ? cookies : undefined;
  }

  clear(): void {
    this.cookies.clear();
  }
}

const globalCookieJar = new CookieJar();

/**
 * Strip Content-Type: application/json when there's no body.
 */
function sanitizeOptions(options?: RequestInit): RequestInit | undefined {
  if (!options?.headers || options.body) return options;
  const headers = new Headers(options.headers);
  if (headers.get("content-type")?.includes("application/json")) {
    headers.delete("content-type");
  }
  const entries = [...headers.entries()];
  return {
    ...options,
    headers: entries.length > 0 ? Object.fromEntries(entries) : undefined,
  };
}

/**
 * Make a request to the API under test.
 */
export async function api(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const sanitized = sanitizeOptions(options);
  const headers: any = {
    ...sanitized?.headers,
  };

  // Add persisted cookies to the request
  const cookieHeader = globalCookieJar.getCookieHeader();
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...sanitized,
    headers,
  });

  // Persist cookies from the response
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    globalCookieJar.setCookie(setCookieHeader);
  }

  return response;
}

/**
 * Make an authenticated request to the API under test.
 * Sends Bearer token if available AND maintains session cookies via cookie jar.
 */
export async function authenticatedApi(
  path: string,
  token: string,
  options?: RequestInit
): Promise<Response> {
  const sanitized = sanitizeOptions(options);
  const headers: any = {
    ...sanitized?.headers,
  };

  // Send Bearer token if provided
  if (token && token.length > 0) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Add persisted cookies to the request
  const cookieHeader = globalCookieJar.getCookieHeader();
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...sanitized,
    headers,
  });

  // Persist cookies from the response
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    globalCookieJar.setCookie(setCookieHeader);
  }

  return response;
}

export interface TestUser {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Sign up a test user and return the token and user object.
 */
export async function signUpTestUser(): Promise<TestUser> {
  // Clear cookies when signing up a new user to ensure fresh session
  globalCookieJar.clear();

  const id = crypto.randomUUID();
  const res = await api("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User",
      email: `testuser+${id}@example.com`,
      password: "TestPassword123!",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to sign up test user (${res.status}): ${body}`);
  }

  const data = (await res.json()) as any;

  // Extract user object - should be at data.user or at root of data
  const user = data.user || data;

  if (!user.id) {
    throw new Error(
      `Failed to extract user ID from sign-up response: ${JSON.stringify(data)}`
    );
  }

  // Try to extract a session token from the response
  // Better Auth might return: { user, session: { token: "..." } }
  // Or it might use cookies + session ID
  let token = "";

  if (data.session?.token) {
    token = data.session.token;
  } else if (data.sessionToken) {
    token = data.sessionToken;
  } else if (data.token) {
    token = data.token;
  } else if (data.session?.id) {
    token = data.session.id;
  } else {
    // Fallback: use user ID as token
    // Authentication will rely on session cookies + credentials: 'include'
    token = user.id;
  }

  if (!token) {
    throw new Error(
      `Failed to extract session from sign-up response: ${JSON.stringify(data)}`
    );
  }

  const testUser: TestUser = {
    token,
    user: {
      id: user.id || "",
      name: user.name || data.name || "Test User",
      email: user.email || data.email || "",
      emailVerified: user.emailVerified ?? data.emailVerified ?? false,
      image: user.image || data.image || null,
      createdAt: user.createdAt || data.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || data.updatedAt || new Date().toISOString(),
    },
  };

  // Auto-register cleanup so the test file doesn't need to
  afterAll(async () => {
    await deleteTestUser(testUser.token);
  });

  return testUser;
}

/**
 * Assert response status and include response body in error on mismatch.
 * Use instead of expect(res.status).toBe(x) for better error messages.
 */
export async function expectStatus(res: Response, ...expected: number[]): Promise<void> {
  if (!expected.includes(res.status)) {
    let body = await res.clone().text().catch(() => "(unable to read body)");
    if (body.length > 500) body = body.slice(0, 500) + "...";
    const path = new URL(res.url).pathname + new URL(res.url).search;
    console.error(`${path} — Expected ${expected.join("|")}, got ${res.status} — ${body}`);
    throw ``;
  }
}

/**
 * Delete the test user (cleanup).
 */
export async function deleteTestUser(token: string): Promise<void> {
  await authenticatedApi("/api/account", token, {
    method: "DELETE",
  });
}

/**
 * Create a dummy file for multipart upload testing.
 * Returns a File object that can be appended to FormData.
 */
export function createTestFile(filename = "test.txt", content = "test file content", type = "text/plain"): File {
  return new File([content], filename, { type });
}

const WS_URL = BASE_URL.replace(/^http/, "ws");

/**
 * Connect to a WebSocket endpoint. Resolves when the connection is open.
 */
export async function connectWebSocket(path: string): Promise<WebSocket> {
  const url = new URL(path, WS_URL);
  const ws = new WebSocket(url.toString());
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve(ws);
    ws.onerror = () => reject(new Error(`WebSocket connection failed: ${url}`));
    setTimeout(() => { ws.close(); reject(new Error("WebSocket connection timeout")); }, 5000);
  });
}

/**
 * Connect to an authenticated WebSocket endpoint.
 * Sends the token as the first message and waits for the authentication response.
 */
export async function connectAuthenticatedWebSocket(path: string, token: string): Promise<WebSocket> {
  const ws = await connectWebSocket(path);
  ws.send(token);
  const response = await waitForMessage(ws);
  const data = JSON.parse(response);
  if (data.error) {
    ws.close();
    throw new Error(`WebSocket auth failed: ${data.error}`);
  }
  return ws;
}

/**
 * Wait for the next message on a WebSocket.
 */
export function waitForMessage(ws: WebSocket, timeout = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    ws.onmessage = (event) => resolve(String(event.data));
    setTimeout(() => reject(new Error("WebSocket message timeout")), timeout);
  });
}
