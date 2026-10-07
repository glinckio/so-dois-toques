import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, rotaPublica } from "@/lib/acesso/cookie";
import { buildCsp, generateNonce } from "@/lib/security/csp";

export function proxy(request: NextRequest) {
  // ACESSO-CA-05: sem cookie de sessão, qualquer página (menos o login) leva ao login.
  // A validade da sessão é conferida pela API em cada página.
  if (!rotaPublica(request.nextUrl.pathname) && !request.cookies.has(COOKIE_SESSAO)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const nonce = generateNonce();
  const csp = buildCsp(nonce, { isDev: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Os ícones do site ficam de fora: o navegador os pede antes de qualquer login.
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
