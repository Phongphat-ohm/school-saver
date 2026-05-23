import { NextResponse, type NextRequest } from "next/server";

function isSameHostApiRequest(request: NextRequest) {
  const requestHost = request.nextUrl.host;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite === "same-origin" || fetchSite === "same-site") return true;

  if (origin) {
    try {
      return new URL(origin).host === requestHost;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      return new URL(referer).host === requestHost;
    } catch {
      return false;
    }
  }

  return false;
}

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api") && !isSameHostApiRequest(request)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const session = request.cookies.get("school_saver_session")?.value;
  const restoreSession = request.cookies.get("school_saver_restore_session")?.value;
  const hasSession = !!session?.startsWith("ss_");
  const hasRestoreSession = !!restoreSession?.startsWith("ss_");

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isRestorePage = pathname === "/restore-account";
  const isPublicPage =
    isAuthPage ||
    isRestorePage ||
    pathname.startsWith("/member-card/") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/reset-password/") ||
    pathname === "/terms" ||
    pathname === "/" ||
    pathname === "/privacy";
  if (isRestorePage && !hasRestoreSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!hasSession && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && (isAuthPage || isRestorePage)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
