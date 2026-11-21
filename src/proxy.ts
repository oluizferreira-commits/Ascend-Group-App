import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: bounces visitors without a session cookie away from
 * /app. Real authentication and authorization happen on the server for every
 * page, action and route handler (src/server/auth/session.ts).
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("ascend_session")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*"] };
