import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  if (
    hostname === "www.abutosystems.com" ||
    (hostname === "abutosystems.com" && request.nextUrl.protocol === "http:")
  ) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.hostname = "abutosystems.com";
    canonicalUrl.protocol = "https:";
    return NextResponse.redirect(canonicalUrl, 301);
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (request.nextUrl.hostname.endsWith(".workers.dev")) {
    response.headers.set("X-Robots-Tag", "noindex");
  }
  return response;
}

export const config = {
  matcher: ["/:path*"],
};
