import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  authenticateApiRequest: (...args: unknown[]) => mocks.authenticate(...args),
  isAuthFailure: (result: { response?: Response }) => "response" in result,
}));

import { POST } from "@/app/api/organizations/route";

describe("POST /api/organizations", () => {
  it("creates the organization without requesting an RLS-protected returning row", async () => {
    mocks.insert.mockResolvedValue({ error: null });
    mocks.authenticate.mockResolvedValue({
      supabase: {
        from: () => ({ insert: mocks.insert }),
      },
      user: { id: "user-123" },
    });

    const response = await POST(
      new Request("http://localhost/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Acme Operations" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ created: true });
    expect(mocks.insert).toHaveBeenCalledWith({
      name: "Acme Operations",
      slug: expect.stringMatching(/^acme-operations-[a-f0-9-]{8}$/),
    });
  });
});
