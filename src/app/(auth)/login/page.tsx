import { AuthShell } from "@/components/layout/auth-shell";
import { AuthForm } from "@/features/auth/components/auth-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  return (
    <AuthShell
      description="Sign in to continue to your operational workspace."
      eyebrow="Welcome back"
      title="Sign in to Pulseboard"
    >
      <AuthForm configured={isSupabaseConfigured()} mode="login" />
    </AuthShell>
  );
}
