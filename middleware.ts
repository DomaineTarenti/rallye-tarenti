import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminPage && !isAdminApi) return NextResponse.next();

  // Chemins publics — exemptés de l'auth
  if (pathname === "/admin/login" || pathname === "/api/admin/auth") {
    return NextResponse.next();
  }

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    // Env var manquante → bloquer l'accès plutôt que d'utiliser un fallback
    if (isAdminApi) {
      return new NextResponse(
        JSON.stringify({ data: null, error: "Configuration serveur manquante" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const cookie = request.cookies.get("admin-auth");

  if (!cookie || cookie.value !== ADMIN_PASSWORD) {
    if (isAdminApi) {
      return new NextResponse(
        JSON.stringify({ data: null, error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
