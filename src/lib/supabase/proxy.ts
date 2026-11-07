import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv, isSupabaseConfigured } from "@/lib/env";

const protectedPrefixes = ["/dashboard", "/onboarding"];
const authPaths = ["/login", "/signup"];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isSupabaseConfigured()) {
    if (isProtectedRoute) {
      return redirectWithSetupHint(request);
    }

    return NextResponse.next({ request });
  }

  const env = getPublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims && !error);

  if (!isAuthenticated && isProtectedRoute) {
    return redirectWithCookies(request, response, "/login");
  }

  if (isAuthenticated && authPaths.includes(pathname)) {
    return redirectWithCookies(request, response, "/onboarding");
  }

  return response;
}

function redirectWithSetupHint(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("setup", "1");
  return NextResponse.redirect(url);
}

function redirectWithCookies(
  request: NextRequest,
  source: NextResponse,
  destination: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = destination;
  url.search = "";
  const redirectResponse = NextResponse.redirect(url);

  for (const cookie of source.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}
