"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters." })
    .max(128, { error: "Password must be 128 characters or fewer." }),
});

export type AuthActionState = {
  status: "error" | "success";
  message: string;
} | null;

function parseCredentials(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = parseCredentials(formData);

  if (!result.success) {
    return {
      status: "error",
      message: result.error.issues[0]?.message ?? "Check your sign-in details.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(result.data);

    if (error) {
      return {
        status: "error",
        message: "We couldn’t sign you in. Check your email and password.",
      };
    }
  } catch {
    return {
      status: "error",
      message:
        "Pulseboard could not reach Supabase. Check your local environment configuration and try again.",
    };
  }

  redirect("/onboarding");
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = parseCredentials(formData);

  if (!result.success) {
    return {
      status: "error",
      message: result.error.issues[0]?.message ?? "Check your account details.",
    };
  }

  let hasSession = false;

  try {
    const env = getPublicEnv();
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      ...result.data,
      options: {
        emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      return {
        status: "error",
        message:
          "We couldn’t create your account. If this email is already registered, sign in instead; otherwise check the details and try again.",
      };
    }

    hasSession = Boolean(data.session);
  } catch {
    return {
      status: "error",
      message:
        "Pulseboard could not reach Supabase. Check your local environment configuration and try again.",
    };
  }

  if (hasSession) {
    redirect("/onboarding");
  }

  return {
    status: "success",
    message:
      "Check your inbox for a confirmation link. You can sign in after confirming your email.",
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
