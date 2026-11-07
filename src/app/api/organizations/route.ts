import { z } from "zod";
import { authenticateApiRequest, isAuthFailure } from "@/lib/api/auth";
import { apiError, apiSuccess, databaseError, readJsonBody, validationError } from "@/lib/api/http";

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(100),
}).strict();

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (isAuthFailure(auth)) return auth.response;

  const { data, error } = await auth.supabase
    .from("organizations")
    .select("id, name, slug, created_at")
    .order("created_at", { ascending: false });

  if (error) return apiError(500, "DATABASE_ERROR", "Could not load organizations.");
  return apiSuccess({ organizations: data });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (isAuthFailure(auth)) return auth.response;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.success) return parsedBody.response;

  const parsed = createOrganizationSchema.safeParse(parsedBody.body);
  if (!parsed.success) return validationError(parsed.error);

  const baseSlug = parsed.data.name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "workspace";
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

  const { error } = await auth.supabase
    .from("organizations")
    .insert({ name: parsed.data.name, slug });

  if (error) return databaseError(error);
  return apiSuccess({ created: true }, 201);
}
