"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  signInAction,
  signUpAction,
  type AuthActionState,
} from "@/features/auth/actions";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
  configured: boolean;
};

const initialState: AuthActionState = null;

export function AuthForm({ mode, configured }: AuthFormProps) {
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const isSignup = mode === "signup";

  return (
    <div className="w-full">
      {!configured && (
        <div
          className="mb-6 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
          role="status"
        >
          <p className="font-semibold">Connect a Supabase project to continue.</p>
          <p className="mt-1 text-amber-900/80">
            Copy <code className="font-mono text-xs">.env.example</code> to{" "}
            <code className="font-mono text-xs">.env.local</code> and add your
            site URL, project URL, and publishable key.
          </p>
        </div>
      )}

      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <label className="field-label" htmlFor="email">
            Work email
          </label>
          <input
            autoComplete="email"
            className="field-input"
            id="email"
            name="email"
            placeholder="you@company.com"
            required
            type="email"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="field-label" htmlFor="password">
              Password
            </label>
            {isSignup && (
              <span className="text-xs text-muted-foreground">8 characters minimum</span>
            )}
          </div>
          <input
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="field-input"
            id="password"
            name="password"
            placeholder={isSignup ? "Create a secure password" : "Enter your password"}
            required
            type="password"
          />
        </div>

        {state && (
          <p
            aria-live="polite"
            className={
              state.status === "success"
                ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900"
                : "rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
            }
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        )}

        <Button
          className="h-11 w-full justify-between rounded-xl px-4 text-sm shadow-sm"
          disabled={isPending || !configured}
          size="lg"
          type="submit"
        >
          <span>{isPending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}</span>
          {isPending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-muted-foreground">
        {isSignup ? "Already have an account?" : "New to Pulseboard?"}{" "}
        <Link
          className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
          href={isSignup ? "/login" : "/signup"}
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
