import { z } from "zod";
import { authenticateApiRequest, authorizeOrganization, isAuthFailure } from "@/lib/api/auth";
import { apiError, apiSuccess, databaseError, readJsonBody, validationError } from "@/lib/api/http";

type RouteContext = { params: Promise<{ organizationId: string }> };
const uuidSchema = z.uuid();
const createSourceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  sourceType: z.string().trim().min(2).max(60),
}).strict();
const updateSourceSchema = z.object({
  sourceId: z.uuid(),
  name: z.string().trim().min(2).max(100).optional(),
  sourceType: z.string().trim().min(2).max(60).optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).strict().refine((value) => value.name !== undefined || value.sourceType !== undefined || value.status !== undefined);

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (isAuthFailure(auth)) return auth.response;
  const { organizationId } = await context.params;
  if (!uuidSchema.safeParse(organizationId).success) {
    return apiError(400, "INVALID_ORGANIZATION_ID", "Organization ID must be a UUID.");
  }
  const access = await authorizeOrganization(auth, organizationId);
  if ("response" in access) return access.response;

  const { data, error } = await auth.supabase
    .from("data_sources")
    .select("id, organization_id, name, source_type, status, created_at, updated_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) return apiError(500, "DATABASE_ERROR", "Could not load data sources.");
  return apiSuccess({ sources: data });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (isAuthFailure(auth)) return auth.response;
  const { organizationId } = await context.params;
  if (!uuidSchema.safeParse(organizationId).success) {
    return apiError(400, "INVALID_ORGANIZATION_ID", "Organization ID must be a UUID.");
  }
  const access = await authorizeOrganization(auth, organizationId, ["admin"]);
  if ("response" in access) return access.response;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.success) return parsedBody.response;
  const parsed = createSourceSchema.safeParse(parsedBody.body);
  if (!parsed.success) return validationError(parsed.error);

  const { data, error } = await auth.supabase
    .from("data_sources")
    .insert({
      organization_id: organizationId,
      name: parsed.data.name,
      source_type: parsed.data.sourceType,
    })
    .select("id, organization_id, name, source_type, status, created_at, updated_at")
    .single();
  if (error) return databaseError(error);
  return apiSuccess({ source: data }, 201);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (isAuthFailure(auth)) return auth.response;
  const { organizationId } = await context.params;
  if (!uuidSchema.safeParse(organizationId).success) {
    return apiError(400, "INVALID_ORGANIZATION_ID", "Organization ID must be a UUID.");
  }
  const access = await authorizeOrganization(auth, organizationId, ["admin"]);
  if ("response" in access) return access.response;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.success) return parsedBody.response;
  const parsed = updateSourceSchema.safeParse(parsedBody.body);
  if (!parsed.success) return validationError(parsed.error);

  const { sourceId, name, sourceType, status } = parsed.data;
  const updates = {
    ...(name !== undefined ? { name } : {}),
    ...(sourceType !== undefined ? { source_type: sourceType } : {}),
    ...(status !== undefined ? { status } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await auth.supabase
    .from("data_sources")
    .update(updates)
    .eq("organization_id", organizationId)
    .eq("id", sourceId)
    .select("id, organization_id, name, source_type, status, created_at, updated_at")
    .maybeSingle();
  if (error) return databaseError(error);
  if (!data) return apiError(404, "SOURCE_NOT_FOUND", "Data source was not found.");
  return apiSuccess({ source: data });
}
