import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/register"];

/**
 * Optimistic auth gate only: redirects to /login when there's no session
 * cookie at all. This deliberately does NOT verify the JWT here — per
 * Next's own guidance, Proxy "should not be used as a full session
 * management or authorization solution", and in practice this app's proxy
 * runtime doesn't reliably see process.env.AUTH_SECRET the way route
 * handlers and Server Components do, so verifying here silently redirected
 * every request (including valid sessions) back to /login.
 *
 * Real enforcement happens where it matters: every API route calls
 * requireSessionUser() (full JWT verification, returns 401 JSON on
 * failure), and /dashboard's Server Component calls getSessionUser() and
 * redirects server-side. An expired/tampered cookie still gets past this
 * gate, but is then rejected by those checks instead of silently trusted.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Only guard page routes (SSR/client navigation). API routes are
     * excluded entirely and each enforces its own auth via
     * requireSessionUser(), returning JSON 401s instead of HTML redirects
     * so client-side fetch() calls fail predictably instead of receiving
     * an HTML login page in place of JSON.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/).*)",
  ],
};
