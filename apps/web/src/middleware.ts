import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CAMPAIGN_REDIRECTS: Record<string, string> = {
  "/wm-ig":
    "/promo?utm_source=instagram&utm_medium=organic_social&utm_campaign=womens_month_2026&utm_content=chefmate_feed",
  "/wm-ig-story":
    "/promo?utm_source=instagram&utm_medium=organic_social&utm_campaign=womens_month_2026&utm_content=chefmate_story",
  "/wm-tt":
    "/promo?utm_source=tiktok&utm_medium=organic_social&utm_campaign=womens_month_2026&utm_content=chefmate_video",
  "/wm-wa":
    "/promo?utm_source=whatsapp&utm_medium=referral&utm_campaign=womens_month_2026&utm_content=team_share",
};

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  // Route apply.chefmate.co.za to the chef recruitment landing page
  if (host.startsWith("apply.")) {
    const url = request.nextUrl.clone();
    if (url.pathname === "/") {
      url.pathname = "/apply";
      return NextResponse.rewrite(url);
    }
  }

  // Campaign short links
  const campaignPath = CAMPAIGN_REDIRECTS[request.nextUrl.pathname];
  if (campaignPath) {
    return NextResponse.redirect(new URL(campaignPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images).*)"],
};
