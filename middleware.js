// middleware.js
import { NextResponse } from "next/server";

export function middleware() {
  const isDev = process.env.NODE_ENV !== "production";

  const csp = [
    "default-src 'self'",
    // Next.js dev butuh 'unsafe-eval' untuk HMR/source maps
    `script-src 'self'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    // izinkan HMR websocket & fetch ke localhost saat dev
    `connect-src 'self' ${isDev ? "ws: http://localhost:* https:" : "https:"}`,
    "font-src 'self' data:",
    "media-src 'self' blob: data:",
    "frame-src 'self'",
  ].join("; ");

  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

// Terapkan ke semua route
export const config = {
  matcher: "/:path*",
};
