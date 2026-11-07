import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_USER_EMAIL ?? "demo@pulseboard.local";
const demoPassword = process.env.DEMO_USER_PASSWORD ?? "PulseboardDemo123!";
const organizationId = process.env.DEMO_ORGANIZATION_ID &&
  process.env.DEMO_ORGANIZATION_ID !== "00000000-0000-4000-8000-000000000000"
  ? process.env.DEMO_ORGANIZATION_ID
  : "f0000000-0000-4000-8000-000000000001";
const intervalFlag = process.argv.find((argument) => argument.startsWith("--interval-ms="));
const intervalMs = intervalFlag ? Number(intervalFlag.split("=")[1]) : 2000;

function requireLocalConfiguration() {
  if (!supabaseUrl || !publishableKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.");
  }
  if (!["localhost", "127.0.0.1"].includes(new URL(supabaseUrl).hostname) ||
      !["localhost", "127.0.0.1"].includes(new URL(siteUrl).hostname)) {
    throw new Error("The event simulator only sends data to local Supabase and Pulseboard URLs.");
  }
  if (!Number.isInteger(intervalMs) || intervalMs < 250 || intervalMs > 60_000) {
    throw new Error("--interval-ms must be an integer between 250 and 60000.");
  }
}

const sleep = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
const choices = [
  { eventType: "checkout.completed", status: "success" },
  { eventType: "payment.authorized", status: "success" },
  { eventType: "order.fulfilled", status: "success" },
  { eventType: "payment.declined", status: "failed" },
  { eventType: "invoice.created", status: "pending" },
];

async function main() {
  requireLocalConfiguration();
  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  });
  if (signInError || !signInData.session) {
    throw new Error("Demo sign-in failed. Run `pnpm db:seed` and verify the demo credentials.");
  }
  let session = signInData.session;

  const api = async (path, options = {}) => {
    const response = await fetch(new URL(path, siteUrl), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...options.headers,
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? `API request failed with status ${response.status}.`);
    }
    return payload;
  };

  const { sources } = await api(`/api/organizations/${organizationId}/sources`);
  if (!sources?.length) throw new Error("No data sources found. Run `pnpm db:seed` first.");

  let stopped = false;
  process.once("SIGINT", () => { stopped = true; });
  process.once("SIGTERM", () => { stopped = true; });
  console.log(`Sending synthetic events to organization ${organizationId} every ${intervalMs} ms. Press Ctrl+C to stop.`);

  let sent = 0;
  while (!stopped) {
    if ((session.expires_at ?? 0) < Math.floor(Date.now() / 1000) + 120) {
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: session.refresh_token });
      if (error || !data.session) throw new Error("Demo session expired; restart the simulator.");
      session = data.session;
    }

    const choice = choices[Math.floor(Math.random() * choices.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    await api(`/api/organizations/${organizationId}/events`, {
      method: "POST",
      body: JSON.stringify({
        sourceId: source.id,
        eventType: choice.eventType,
        status: choice.status,
        occurredAt: new Date().toISOString(),
        durationMs: Math.floor(35 + Math.random() * 1500),
        value: Number((10 + Math.random() * 500).toFixed(2)),
        currency: "USD",
        correlationId: crypto.randomUUID(),
        attributes: {
          environment: "simulator",
          region: ["us-east", "eu-west", "ap-southeast"][Math.floor(Math.random() * 3)],
        },
      }),
    });
    sent += 1;
    console.log(`Inserted event #${sent}: ${choice.eventType} (${choice.status})`);
    await sleep(intervalMs);
  }

  await supabase.auth.signOut();
  console.log(`Simulator stopped after sending ${sent} events.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Event simulator failed.");
  process.exitCode = 1;
});
