export type UserRole = "agent" | "supervisor" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthSuccessResponse {
  token: string;
  user: AuthUser;
}

export interface SignupSuccessResponse {
  success: boolean;
  message: string;
}

export const AUTH_TOKEN_KEY = "echoai_token";
export const AUTH_USER_KEY = "echoai_user";
const TOKEN_COOKIE_KEY = "echoai_token";

const ROLE_ACCESS = {
  "/agent": ["agent", "supervisor", "admin"],
  "/dashboard": ["agent", "supervisor", "admin"],
  "/supervisor": ["supervisor", "admin"],
  "/admin": ["admin"],
} as const;

export function getDefaultRouteForRole(role: UserRole) {
  switch (role) {
    case "admin":
      return "/admin";
    case "supervisor":
      return "/supervisor";
    case "agent":
    default:
      return "/dashboard";
  }
}

export function getAllowedRolesForPath(pathname: string): UserRole[] | null {
  const match = Object.entries(ROLE_ACCESS).find(([prefix]) => pathname.startsWith(prefix));
  return match ? [...match[1]] : null;
}

export function canAccessPath(pathname: string, role: UserRole) {
  const allowedRoles = getAllowedRolesForPath(pathname);
  return allowedRoles ? allowedRoles.includes(role) : true;
}

function base64UrlEncode(value: string) {
  if (typeof globalThis.btoa === "function") {
    return globalThis
      .btoa(value)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  return "";
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const encoded = normalized + padding;

  if (typeof globalThis.atob === "function") {
    return globalThis.atob(encoded);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(encoded, "base64").toString("utf8");
  }

  return "";
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");

    if (!payload) {
      return null;
    }

    return JSON.parse(base64UrlDecode(payload));
  } catch {
    return null;
  }
}

export function decodeRoleFromToken(token: string): UserRole | null {
  const payload = decodeJwtPayload(token);
  const role = payload?.role;

  return role === "agent" || role === "supervisor" || role === "admin" ? role : null;
}

export function isTokenExpired(token: string) {
  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === "number" ? payload.exp : null;

  if (!exp) {
    return false;
  }

  return Date.now() >= exp * 1000;
}

export function persistAuthSession(token: string, user: AuthUser) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  document.cookie = `${TOKEN_COOKIE_KEY}=${token}; path=/; max-age=${60 * 60 * 8}; samesite=lax`;
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  document.cookie = `${TOKEN_COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
}

export function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredAuthUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getStoredSessionRole(): UserRole | null {
  const token = getStoredAuthToken();

  if (!token || isTokenExpired(token)) {
    return null;
  }

  return decodeRoleFromToken(token);
}

function buildDemoToken(user: AuthUser) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
    })
  );

  return `${header}.${payload}.echoai-demo`;
}

async function parseError(response: Response) {
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message || body.error || "Authentication request failed.";
  } catch {
    return "Authentication request failed.";
  }
}

async function safePost<T>(url: string, payload: object): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (response.status !== 404 && response.status !== 405) {
      throw new Error(await parseError(response));
    }

    return null;
  } catch (error) {
    if (error instanceof Error && error.message !== "Failed to fetch") {
      throw error;
    }

    return null;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginWithPassword(
  payload: LoginPayload,
  selectedRole: UserRole = "agent"
): Promise<AuthSuccessResponse> {
  const apiResponse = await safePost<AuthSuccessResponse>("/api/auth/login", payload);

  if (apiResponse) {
    return apiResponse;
  }

  await wait(550);

  const inferredName = payload.email.split("@")[0]?.replace(/[._-]/g, " ") || "Echo Operator";
  const user: AuthUser = {
    id: `demo-${selectedRole}-${Date.now()}`,
    name: inferredName.replace(/\b\w/g, (char) => char.toUpperCase()),
    email: payload.email,
    role: selectedRole,
  };

  return {
    token: buildDemoToken(user),
    user,
  };
}

export async function signupWithPassword(payload: SignupPayload): Promise<SignupSuccessResponse> {
  const apiResponse = await safePost<SignupSuccessResponse>("/api/auth/signup", payload);

  if (apiResponse) {
    return apiResponse;
  }

  await wait(700);

  return {
    success: true,
    message:
      payload.role && payload.role !== "agent"
        ? "Account request submitted. Elevated roles still require backend approval."
        : "Account created successfully.",
  };
}
