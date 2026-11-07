import { z } from "zod";
import { authenticateApiRequest, authorizeOrganization, isAuthFailure } from "@/lib/api/auth";
import { apiError, apiSuccess, databaseError, readJsonBody, validationError } from "@/lib/api/http";

type RouteContext = { params: Promise<{ organizationId: string }> };
const uuidSchema = z.uuid();
const statusSchema = z.enum(["success", "failed", "pending"]);
const sortableColumns = ["occurred_at", "event_type", "status", "duration_ms", "value"] as const;
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  status: statusSchema.optional(),
  sourceId: z.uuid().optional(),
  eventType: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(sortableColumns).default("occurred_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
}).strict();

const createEventSchema = z.object({
  sourceId: z.uuid().nullable().optional(),
  eventType: z.string().trim().min(1).max(100),
  status: statusSchema.default("success"),
  occurredAt: z.iso.datetime({ offset: true }).optional(),
  durationMs: z.number().int().min(0).max(2_147_483_647).nullable().optional(),
  value: z.number().finite().min(-999_999_999_999).max(999_999_999_999).nullable().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  correlationId: z.uuid().nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).default({}),
}).strict();

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (isAuthFailure(auth)) return auth.response;
  const { organizationId } = await context.params;
  if (!uuidSchema.safeParse(organizationId).success) {
    return apiError(400, "INVALID_ORGANIZATION_ID", "Organization ID must be a UUID.");
  }
  const access = await authorizeOrganization(auth, organizationId);
  if ("response" in access) return access.response;

  const params = new URL(request.url).searchParams;
  const parsed = listQuerySchema.safeParse(Object.fromEntries(params.entries()));
  if (!parsed.success) return validationError(parsed.error);

  const { limit, offset, status, sourceId, eventType, search, sort, order, from, to } = parsed.data;
  if (from && to && Date.parse(from) >= Date.parse(to)) {
    return apiError(422, "INVALID_DATE_RANGE", "The from value must be earlier than to.");
  }

  let query = auth.supabase
    .from("events")
    .select("id, organization_id, source_id, event_type, status, occurred_at, received_at, duration_ms, value, currency, correlation_id, attributes", { count: "exact" })
    .eq("organization_id", organizationId)
    .order(sort, { ascending: order === "asc", nullsFirst: false })
    .order("id", { ascending: order === "asc" })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (sourceId) query = query.eq("source_id", sourceId);
  if (eventType) query = query.eq("event_type", eventType);
  if (search) query = query.ilike("event_type", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
  if (from) query = query.gte("occurred_at", from);
  if (to) query = query.lt("occurred_at", to);

  const { data, count, error } = await query;
  if (error) return apiError(500, "DATABASE_ERROR", "Could not load events.");
  return apiSuccess({ events: data, page: { limit, offset, total: count ?? 0 } });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (isAuthFailure(auth)) return auth.response;
  const { organizationId } = await context.params;
  if (!uuidSchema.safeParse(organizationId).success) {
    return apiError(400, "INVALID_ORGANIZATION_ID", "Organization ID must be a UUID.");
  }
  const access = await authorizeOrganization(auth, organizationId, ["admin", "analyst"]);
  if ("response" in access) return access.response;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.success) return parsedBody.response;
  const parsed = createEventSchema.safeParse(parsedBody.body);
  if (!parsed.success) return validationError(parsed.error);

  const event = parsed.data;
  if (event.sourceId) {
    const { data: source, error: sourceError } = await auth.supabase
      .from("data_sources")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("id", event.sourceId)
      .eq("status", "active")
      .maybeSingle();
    if (sourceError) return apiError(500, "DATABASE_ERROR", "Could not verify the data source.");
    if (!source) return apiError(422, "SOURCE_INACTIVE_OR_NOT_FOUND", "Choose an active data source in this organization.");
  }
  const { data, error } = await auth.supabase
    .from("events")
    .insert({
      organization_id: organizationId,
      source_id: event.sourceId ?? null,
      event_type: event.eventType,
      status: event.status,
      occurred_at: event.occurredAt ?? new Date().toISOString(),
      duration_ms: event.durationMs ?? null,
      value: event.value ?? null,
      currency: event.currency ?? null,
      correlation_id: event.correlationId ?? null,
      attributes: event.attributes,
    })
    .select("id, organization_id, source_id, event_type, status, occurred_at, received_at, duration_ms, value, currency, correlation_id, attributes")
    .single();
  if (error) return databaseError(error);
  return apiSuccess({ event: data }, 201);
}
