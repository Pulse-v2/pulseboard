import { createClient as createJwtClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import { apiError } from "@/lib/api/http";
import { createClient } from "@/lib/supabase/server";

export type AuthenticatedApiRequest = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
};

export async function authenticateApiRequest(
  request: Request,
): Promise<AuthenticatedApiRequest | { response: Response }> {
  try {
    const authorization = request.headers.get("authorization");
    let supabase: AuthenticatedApiRequest["supabase"];
    let user: User | null = null;

    if (authorization) {
      const match = /^Bearer\s+(.+)$/i.exec(authorization);
      if (!match) return { response: apiError(401, "UNAUTHENTICATED", "Sign in to continue.") };

      const env = getPublicEnv();
      const token = match[1];
      supabase = createJwtClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        },
      );
      const result = await supabase.auth.getUser(token);
      user = result.data.user;
    } else {
      supabase = await createClient();
      const result = await supabase.auth.getUser();
      user = result.data.user;
    }

    if (!user) return { response: apiError(401, "UNAUTHENTICATED", "Sign in to continue.") };
    return { supabase, user };
  } catch {
    return { response: apiError(503, "AUTH_UNAVAILABLE", "Authentication is temporarily unavailable.") };
  }
}

export async function authorizeOrganization(
  context: AuthenticatedApiRequest,
  organizationId: string,
  allowedRoles: readonly string[] = ["admin", "analyst", "viewer"],
) {
  const { data, error } = await context.supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (error) {
    return { response: apiError(500, "AUTHORIZATION_ERROR", "Could not verify organization access.") };
  }
  if (!data) {
    return { response: apiError(403, "FORBIDDEN", "You do not have access to this organization.") };
  }
  if (!allowedRoles.includes(data.role)) {
    return { response: apiError(403, "INSUFFICIENT_ROLE", "Your role cannot perform this action.") };
  }
  return { role: data.role };
}

export function isAuthFailure(
  result: AuthenticatedApiRequest | { response: Response },
): result is { response: Response } {
  return "response" in result;
}
