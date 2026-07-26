import { NextResponse, type NextRequest } from "next/server";

// Next 16: the old `middleware` convention is now `proxy` (nodejs runtime).
// Gate the whole app behind HTTP Basic auth so a public deploy doesn't expose
// the catalog — or let anyone trigger paid Claude calls (dedup, síntese, Canvas,
// PRD). Credentials come from env; if unset (e.g. local dev) auth is skipped.
export function proxy(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  // Not configured → no gate (keeps local dev and previews frictionless).
  if (!user || !pass) return NextResponse.next();

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    const givenUser = decoded.slice(0, idx);
    const givenPass = decoded.slice(idx + 1);
    if (givenUser === user && givenPass === pass) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Innovation Hub"' },
  });
}

// Run on every route (pages, API, server actions) except static assets.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
