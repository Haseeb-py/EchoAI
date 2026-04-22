import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccessPath, decodeRoleFromToken, isTokenExpired } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/supervisor") &&
    !pathname.startsWith("/admin")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("echoai_token")?.value;

  if (!token || isTokenExpired(token)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const role = decodeRoleFromToken(token);

  if (!role || !canAccessPath(pathname, role)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/supervisor/:path*", "/admin/:path*"],
};
