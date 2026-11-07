"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pause, Play, RotateCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ConnectionState = "connecting" | "live" | "reconnecting";

function readPaused(key: string) {
  return typeof window !== "undefined" && window.localStorage.getItem(key) === "paused";
}

function subscribeToPausePreference(key: string, callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("pulseboard:realtime-preference", callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pulseboard:realtime-preference", callback);
  };
}

export function RealtimeUpdates({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const preferenceKey = `pulseboard:realtime:${organizationId}`;
  const isPaused = useSyncExternalStore(
    (callback) => subscribeToPausePreference(preferenceKey, callback),
    () => readPaused(preferenceKey),
    () => false,
  );
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  useEffect(() => {
    if (isPaused) return;

    let disposed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const supabase = createClient();

    const channel = supabase
      .channel(`organization-events-${organizationId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "events",
        filter: `organization_id=eq.${organizationId}`,
      }, () => {
        if (disposed) return;
        setLastEventAt(Date.now());
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => router.refresh(), 250);
      })
      .subscribe((status) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          setConnectionState("live");
          setRetryAvailable(false);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionState("reconnecting");
        } else if (status === "CLOSED") {
          setConnectionState("reconnecting");
        }
      });

    const onOffline = () => setConnectionState("reconnecting");
    const onOnline = () => {
      setConnectionState("reconnecting");
      // Recreate the channel after connectivity returns so a stale socket
      // cannot leave the UI stuck in reconnecting state.
      setRetryKey((value) => value + 1);
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      void supabase.removeChannel(channel);
    };
  }, [isPaused, organizationId, retryKey, router]);

  useEffect(() => {
    if (connectionState !== "reconnecting") return;
    const timer = setTimeout(() => setRetryAvailable(true), 5000);
    return () => clearTimeout(timer);
  }, [connectionState]);

  function togglePaused() {
    const nextPaused = !isPaused;
    window.localStorage.setItem(preferenceKey, nextPaused ? "paused" : "live");
    window.dispatchEvent(new Event("pulseboard:realtime-preference"));
    if (!nextPaused) {
      setConnectionState("connecting");
      setRetryAvailable(false);
      setRetryKey((value) => value + 1);
      // Catch up on updates missed while this browser was paused.
      router.refresh();
    }
    setLastEventAt(null);
  }

  const stateLabel = isPaused ? "Paused" : {
    connecting: "Connecting",
    live: "Live",
    reconnecting: "Reconnecting",
  }[connectionState];
  const stateTone = connectionState === "live" && !isPaused
    ? "bg-emerald-50 text-emerald-800"
    : connectionState === "reconnecting" && !isPaused
      ? "bg-amber-50 text-amber-800"
      : "bg-slate-100 text-slate-600";

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Live event updates">
      <span aria-live="polite" className={`inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold ${stateTone}`} role="status">
        {connectionState === "connecting" && !isPaused
          ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
          : <span aria-hidden="true" className={`size-1.5 rounded-full ${connectionState === "live" && !isPaused ? "animate-pulse bg-emerald-500" : connectionState === "reconnecting" && !isPaused ? "bg-amber-500" : "bg-slate-400"}`} />}
        {stateLabel}
      </span>
      {lastEventAt !== null && !isPaused && <span className="hidden text-[11px] text-slate-500 sm:inline">Updated {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(lastEventAt)}</span>}
      {!isPaused && retryAvailable && <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2.5 text-xs font-medium text-amber-900 hover:bg-amber-50" onClick={() => { setRetryAvailable(false); setConnectionState("connecting"); setRetryKey((value) => value + 1); }} type="button"><RotateCw aria-hidden="true" className="size-3.5" /> Retry</button>}
      <button aria-pressed={!isPaused} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/30" onClick={togglePaused} type="button">
        {isPaused ? <Play aria-hidden="true" className="size-3.5" /> : <Pause aria-hidden="true" className="size-3.5" />}
        {isPaused ? "Resume" : "Pause"}
      </button>
      <span className="sr-only">Changes refresh this page&apos;s metrics and event list.</span>
    </div>
  );
}
