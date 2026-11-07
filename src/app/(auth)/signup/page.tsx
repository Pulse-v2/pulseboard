import { AuthShell } from "@/components/layout/auth-shell";
import { AuthForm } from "@/features/auth/components/auth-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function SignupPage() {
  return (
    <AuthShell
      description="Create an account to start bringing your operational events together."
      eyebrow="Get started"
      title="Create your account"
    >
      <AuthForm configured={isSupabaseConfigured()} mode="signup" />
      <p className="mt-7 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-muted-foreground">
        By continuing, you agree to use synthetic or authorized data in your
        Pulseboard workspace.
      </p>
    </AuthShell>
  );
}
