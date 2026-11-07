"use client";

import { useState, type FormEvent } from "react";
import { Check, CircleAlert, Database, LoaderCircle, Pencil, Plus, Radio, X } from "lucide-react";

type Source = {
  id: string;
  name: string;
  source_type: string;
  status: "active" | "inactive";
  created_at: string;
};

type Props = {
  organizationId: string;
  initialSources: Source[];
  canManage: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

export function DataSourcesManager({ organizationId, initialSources, canManage }: Props) {
  const [sources, setSources] = useState(initialSources);
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState("Webhook");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function send(path: string, method: "POST" | "PATCH", body: unknown) {
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json() as { source?: Source; error?: { message?: string } };
    if (!response.ok || !result.source) throw new Error(result.error?.message ?? "Could not save this data source.");
    return result.source;
  }

  async function createSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const normalizedName = name.trim();
    if (normalizedName.length < 2) {
      setError("Enter a source name with at least 2 characters.");
      return;
    }

    setBusy(true);
    try {
      const source = await send(`/api/organizations/${organizationId}/sources`, "POST", { name: normalizedName, sourceType });
      setSources((current) => [source, ...current]);
      setName("");
      setNotice("Data source added.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create this data source.");
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(source: Source) {
    setEditingId(source.id);
    setDraftName(source.name);
    setDraftType(source.source_type);
    setError("");
    setNotice("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>, sourceId: string) {
    event.preventDefault();
    setBusyId(sourceId);
    setError("");
    setNotice("");
    try {
      const source = await send(`/api/organizations/${organizationId}/sources`, "PATCH", { sourceId, name: draftName, sourceType: draftType });
      setSources((current) => current.map((item) => item.id === sourceId ? source : item));
      setEditingId(null);
      setNotice("Data source updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this data source.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(source: Source) {
    setBusyId(source.id);
    setError("");
    setNotice("");
    try {
      const updated = await send(`/api/organizations/${organizationId}/sources`, "PATCH", {
        sourceId: source.id,
        status: source.status === "active" ? "inactive" : "active",
      });
      setSources((current) => current.map((item) => item.id === source.id ? updated : item));
      setNotice(`${source.name} is now ${updated.status}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update source status.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {canManage && <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:p-6">
        <div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-lg bg-teal-50 text-teal-800"><Plus aria-hidden="true" className="size-4" /></span><div><h2 className="text-sm font-semibold text-slate-900">Add a data source</h2><p className="mt-1 text-xs text-slate-500">Connect an event producer to this workspace.</p></div></div>
        <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate onSubmit={createSource}>
          <label className="space-y-1.5"><span className="text-[11px] font-semibold text-slate-500">Source name <span className="font-normal text-slate-400">(required)</span></span><input className="field-input h-10" maxLength={100} minLength={2} onChange={(event) => setName(event.target.value)} placeholder="e.g. Checkout service" required value={name} /></label>
          <label className="space-y-1.5"><span className="text-[11px] font-semibold text-slate-500">Source type</span><select className="field-input h-10 py-0" onChange={(event) => setSourceType(event.target.value)} value={sourceType}><option>Webhook</option><option>REST API</option><option>Background worker</option><option>Internal service</option><option>Other</option></select></label>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} type="submit">{busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />} Add source</button>
        </form>
      </section>}

      {error && <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert"><CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{error}</div>}
      {notice && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status"><Check aria-hidden="true" className="size-4 shrink-0" />{notice}</div>}
      {!canManage && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">You can view data sources. Contact a workspace admin to add or edit one.</div>}

      <section aria-labelledby="sources-list-title" className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-900" id="sources-list-title">Workspace sources</h2><p className="mt-1 text-xs text-slate-500">{sources.length} configured {sources.length === 1 ? "source" : "sources"} · Inactive sources cannot send new events.</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"><Database className="size-3.5" /> {sources.filter((source) => source.status === "active").length} active</span></div>
        {sources.length ? <div className="divide-y divide-slate-100">{sources.map((source) => <div className="px-5 py-4 sm:px-6" key={source.id}>
          {editingId === source.id ? <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end" onSubmit={(event) => saveEdit(event, source.id)}><label className="space-y-1"><span className="text-[10px] font-semibold text-slate-500">Name</span><input autoFocus className="field-input h-9" maxLength={100} minLength={2} onChange={(event) => setDraftName(event.target.value)} required value={draftName} /></label><label className="space-y-1"><span className="text-[10px] font-semibold text-slate-500">Type</span><input className="field-input h-9" maxLength={60} minLength={2} onChange={(event) => setDraftType(event.target.value)} required value={draftType} /></label><button className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white disabled:opacity-60" disabled={busyId === source.id} type="submit"><Check className="size-3.5" /> Save</button><button aria-label="Cancel editing" className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-slate-600 hover:bg-slate-50" onClick={() => setEditingId(null)} type="button"><X className="size-4" /></button></form> : <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Radio aria-hidden="true" className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{source.name}</p><p className="mt-1 text-xs text-slate-500">{source.source_type} <span className="px-1 text-slate-300">·</span> Added {formatDate(source.created_at)}</p></div></div><div className="flex items-center gap-2 sm:shrink-0"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${source.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}><span className={`size-1.5 rounded-full ${source.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />{source.status}</span>{canManage && <><button aria-label={`Edit ${source.name}`} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => beginEdit(source)} type="button"><Pencil className="size-3.5" /> Edit</button><button className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50" disabled={busyId === source.id} onClick={() => toggleStatus(source)} type="button">{busyId === source.id ? "Saving…" : source.status === "active" ? "Deactivate" : "Activate"}</button></>}</div></div>}
        </div>)}</div> : <div className="px-6 py-14 text-center"><span className="mx-auto grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-500"><Database aria-hidden="true" className="size-5" /></span><h3 className="mt-4 text-sm font-semibold text-slate-900">No data sources yet</h3><p className="mt-1 text-sm text-slate-500">Add a source to organize incoming events by system.</p></div>}
      </section>
    </div>
  );
}
