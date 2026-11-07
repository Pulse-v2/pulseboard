import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const email = process.env.DEMO_USER_EMAIL ?? "demo@pulseboard.local";
const password = process.env.DEMO_USER_PASSWORD ?? "PulseboardDemo123!";
const organizationId = process.env.DEMO_ORGANIZATION_ID &&
  process.env.DEMO_ORGANIZATION_ID !== "00000000-0000-4000-8000-000000000000"
  ? process.env.DEMO_ORGANIZATION_ID
  : "f0000000-0000-4000-8000-000000000001";

async function main() {
  if (!supabaseUrl || !publishableKey) {
    throw new Error("Set the local Supabase URL and publishable key in .env.local.");
  }
  if (!["localhost", "127.0.0.1"].includes(new URL(supabaseUrl).hostname) ||
      !["localhost", "127.0.0.1"].includes(new URL(siteUrl).hostname)) {
    throw new Error("Backend verification is restricted to local URLs.");
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData.session) throw new Error("Demo sign-in failed; run `pnpm db:seed` first.");

  const callApi = async (path, options = {}) => {
    const response = await fetch(new URL(path, siteUrl), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.session.access_token}`,
        ...options.headers,
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`${response.status}: ${body?.error?.message ?? "API request failed"}`);
    return body;
  };

  const prefix = `/api/organizations/${organizationId}`;
  const sources = await callApi(`${prefix}/sources`);
  if (!sources.sources?.length) throw new Error("Database read failed: no seeded sources were returned.");

  const eventType = `verification.${crypto.randomUUID()}`;
  await callApi(`${prefix}/events`, {
    method: "POST",
    body: JSON.stringify({
      sourceId: sources.sources[0].id,
      eventType,
      status: "success",
      occurredAt: new Date().toISOString(),
      durationMs: 1,
      currency: "USD",
      attributes: { verification: true },
    }),
  });

  const events = await callApi(`${prefix}/events?eventType=${encodeURIComponent(eventType)}&limit=1`);
  if (events.page.total !== 1) throw new Error("Database read-after-write verification failed.");

  const from = new Date(Date.now() - 60_000).toISOString();
  const to = new Date(Date.now() + 60_000).toISOString();
  const dashboard = await callApi(
    `${prefix}/dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&eventType=${encodeURIComponent(eventType)}`,
  );
  if (Number(dashboard.summary?.total_events) !== 1) {
    throw new Error("Dashboard aggregation RPC did not return the inserted event.");
  }

  await supabase.auth.signOut();
  console.log("Backend verification passed: source read, event insert/read, and dashboard aggregation RPC.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Backend verification failed.");
  process.exitCode = 1;
});
