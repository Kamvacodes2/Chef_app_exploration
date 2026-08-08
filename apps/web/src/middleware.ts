import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  // Route apply.chefmate.co.za to the chef recruitment landing page
  if (host.startsWith("apply.")) {
    const url = request.nextUrl.clone();
    // Rewrite / to /apply on the apply subdomain
    if (url.pathname === "/") {
      url.pathname = "/apply";
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images).*)"],
};
