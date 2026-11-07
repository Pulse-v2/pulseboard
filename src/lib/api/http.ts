import { z } from "zod";

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return Response.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function apiSuccess(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function readJsonBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      success: false as const,
      response: apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Send a JSON request body."),
    };
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 1_000_000) {
    return {
      success: false as const,
      response: apiError(413, "PAYLOAD_TOO_LARGE", "Request body must be under 1 MB."),
    };
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 1_000_000) {
      return {
        success: false as const,
        response: apiError(413, "PAYLOAD_TOO_LARGE", "Request body must be under 1 MB."),
      };
    }
    body = JSON.parse(text);
  } catch {
    return {
      success: false as const,
      response: apiError(400, "INVALID_JSON", "Request body must contain valid JSON."),
    };
  }

  return { success: true as const, body };
}

export function validationError(error: z.ZodError) {
  return apiError(
    422,
    "VALIDATION_ERROR",
    "One or more fields are invalid.",
    error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  );
}

export function databaseError(error: { code?: string }) {
  if (error.code === "23505") {
    return apiError(409, "CONFLICT", "A record with these details already exists.");
  }
  if (error.code === "23503") {
    return apiError(422, "INVALID_REFERENCE", "A referenced record does not exist in this organization.");
  }
  if (error.code === "23514" || error.code === "22P02") {
    return apiError(422, "INVALID_DATA", "The submitted data is not valid.");
  }
  return apiError(500, "DATABASE_ERROR", "The request could not be completed.");
}
