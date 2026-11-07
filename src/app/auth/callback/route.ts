import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
    } catch {
      // Return a generic callback error without exposing provider details.
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback", request.url));
}
