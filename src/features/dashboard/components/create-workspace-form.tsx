"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";

type ErrorPayload = { error?: { message?: string } };

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.get("name") }),
      });
      const payload = await response.json() as ErrorPayload;
      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? "Workspace could not be created. Try again.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setErrorMessage("Pulseboard could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2 text-left">
        <label className="field-label" htmlFor="workspace-name">Organization name</label>
        <input
          autoComplete="organization"
          className="field-input"
          id="workspace-name"
          maxLength={100}
          minLength={2}
          name="name"
          placeholder="Acme Operations"
          required
        />
      </div>
      {errorMessage && (
        <p aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-left text-sm text-rose-900" role="alert">
          {errorMessage}
        </p>
      )}
      <button
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? <><LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> Creating workspace</> : <>Create workspace <ArrowRight aria-hidden="true" className="size-4" /></>}
      </button>
    </form>
  );
}
