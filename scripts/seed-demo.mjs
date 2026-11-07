import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoEmail = process.env.DEMO_USER_EMAIL ?? "demo@pulseboard.local";
const demoPassword = process.env.DEMO_USER_PASSWORD ?? "PulseboardDemo123!";
const defaultOrganizationId = "f0000000-0000-4000-8000-000000000001";
const configuredOrganizationId = process.env.DEMO_ORGANIZATION_ID;
const organizationId =
  configuredOrganizationId &&
  configuredOrganizationId !== "00000000-0000-4000-8000-000000000000"
    ? configuredOrganizationId
    : defaultOrganizationId;

function requireLocalConfiguration() {
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  const hostname = new URL(supabaseUrl).hostname;
  if (!["localhost", "127.0.0.1", "host.docker.internal"].includes(hostname)) {
    throw new Error("Demo seeding is restricted to a local Supabase URL.");
  }
  if (demoPassword.length < 12 || demoPassword.startsWith("replace_")) {
    throw new Error("Set DEMO_USER_PASSWORD to a local-only password of at least 12 characters.");
  }
  if (!/^[0-9a-f-]{36}$/i.test(organizationId)) {
    throw new Error("DEMO_ORGANIZATION_ID must be a UUID.");
  }
}

function assertNoError(result, operation) {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`);
  return result.data;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

async function main() {
  requireLocalConfiguration();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const users = assertNoError(
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    "Could not list local users",
  );
  let demoUser = users.users.find((user) => user.email?.toLowerCase() === demoEmail.toLowerCase());
  if (demoUser) {
    demoUser = assertNoError(
      await supabase.auth.admin.updateUserById(demoUser.id, {
        password: demoPassword,
        email_confirm: true,
      }),
      "Could not update the demo account",
    ).user;
  } else {
    demoUser = assertNoError(
      await supabase.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
      }),
      "Could not create the demo account",
    ).user;
  }

  assertNoError(
    await supabase.from("organizations").upsert(
      {
        id: organizationId,
        name: "Northstar Commerce",
        slug: "northstar-commerce-demo",
        created_by: demoUser.id,
      },
      { onConflict: "id" },
    ),
    "Could not seed the demo organization",
  );
  assertNoError(
    await supabase.from("organization_members").upsert(
      { organization_id: organizationId, user_id: demoUser.id, role: "admin" },
      { onConflict: "organization_id,user_id" },
    ),
    "Could not seed the demo membership",
  );

  const sourceRows = [
    { organization_id: organizationId, name: "Web checkout", source_type: "webhook", status: "active" },
    { organization_id: organizationId, name: "Billing worker", source_type: "worker", status: "active" },
    { organization_id: organizationId, name: "Legacy importer", source_type: "batch", status: "inactive" },
  ];
  const sources = assertNoError(
    await supabase
      .from("data_sources")
      .upsert(sourceRows, { onConflict: "organization_id,name" })
      .select("id, name"),
    "Could not seed data sources",
  );

  assertNoError(
    await supabase.from("events").delete().eq("organization_id", organizationId),
    "Could not clear previous demo events",
  );

  const random = seededRandom(20261104);
  const now = Date.now();
  const types = ["checkout.completed", "payment.authorized", "order.fulfilled", "invoice.created", "subscription.renewed"];
  const events = Array.from({ length: 720 }, (_, index) => {
    const roll = random();
    const status = roll < 0.86 ? "success" : roll < 0.95 ? "failed" : "pending";
    const source = sources[index % sources.length];
    const occurredAt = new Date(now - Math.floor(random() * 30 * 24 * 60 * 60 * 1000));
    return {
      organization_id: organizationId,
      source_id: source.id,
      event_type: types[Math.floor(random() * types.length)],
      status,
      occurred_at: occurredAt.toISOString(),
      duration_ms: Math.floor(40 + random() * 1_400),
      value: (8 + random() * 900).toFixed(2),
      currency: "USD",
      correlation_id: crypto.randomUUID(),
      attributes: {
        environment: "demo",
        region: ["us-east", "eu-west", "ap-southeast"][Math.floor(random() * 3)],
        sequence: index + 1,
      },
    };
  });

  for (let index = 0; index < events.length; index += 250) {
    assertNoError(
      await supabase.from("events").insert(events.slice(index, index + 250)),
      `Could not insert demo event batch ${Math.floor(index / 250) + 1}`,
    );
  }

  console.log(`Seeded local organization ${organizationId} with ${events.length} synthetic events.`);
  console.log(`Demo sign-in: ${demoEmail} / ${demoPassword}`);
  console.log("These credentials and records are for local development only.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Demo seeding failed.");
  process.exitCode = 1;
});
