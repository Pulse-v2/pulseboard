import { z } from "zod";
import { authenticateApiRequest, authorizeOrganization, isAuthFailure } from "@/lib/api/auth";
import { apiError, apiSuccess, validationError } from "@/lib/api/http";

type RouteContext = { params: Promise<{ organizationId: string }> };
const querySchema = z.object({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  sourceId: z.uuid().optional(),
  status: z.enum(["success", "failed", "pending"]).optional(),
  eventType: z.string().trim().min(1).max(100).optional(),
}).strict();
const uuidSchema = z.uuid();

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
  const parsed = querySchema.safeParse(Object.fromEntries(params.entries()));
  if (!parsed.success) return validationError(parsed.error);

  const to = parsed.data.to ?? new Date().toISOString();
  const from = parsed.data.from ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  if (Date.parse(from) >= Date.parse(to)) {
    return apiError(422, "INVALID_DATE_RANGE", "The from value must be earlier than to.");
  }
  if (Date.parse(to) - Date.parse(from) > 366 * 24 * 60 * 60 * 1000) {
    return apiError(422, "RANGE_TOO_LARGE", "Dashboard ranges cannot exceed 366 days.");
  }

  const filters = {
    p_organization_id: organizationId,
    p_from: from,
    p_to: to,
    p_source_id: parsed.data.sourceId ?? null,
    p_status: parsed.data.status ?? null,
    p_event_type: parsed.data.eventType ?? null,
  };
  const [summary, timeseries] = await Promise.all([
    auth.supabase.rpc("dashboard_summary", filters),
    auth.supabase.rpc("dashboard_timeseries", filters),
  ]);
  if (summary.error || timeseries.error) {
    return apiError(500, "AGGREGATION_ERROR", "Could not load dashboard metrics.");
  }

  return apiSuccess({
    range: { from, to },
    summary: summary.data?.[0] ?? null,
    timeseries: timeseries.data ?? [],
  });
}
