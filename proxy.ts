import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Contrôle optimiste : la vérification réelle de la signature du cookie
// se fait côté serveur (requireAdmin) dans chaque page et action admin.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("admin_session")?.value);

  if (pathname === "/admin/login") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
