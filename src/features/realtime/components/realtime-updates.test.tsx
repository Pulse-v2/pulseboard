import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeUpdates } from "@/features/realtime/components/realtime-updates";

const mocks = vi.hoisted(() => {
  const refresh = vi.fn();
  return {
    refresh,
    router: { refresh },
    onEvent: vi.fn(),
    onStatus: vi.fn(),
    subscribe: vi.fn(),
    removeChannel: vi.fn(),
    on: vi.fn(),
    channel: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: (...args: unknown[]) => {
      mocks.channel(...args);
      return {
        on: (...onArgs: unknown[]) => {
          mocks.on(...onArgs);
          mocks.onEvent.mockImplementation(
            onArgs[2] as (...args: unknown[]) => void,
          );
          return {
            subscribe: (callback: (status: string) => void) => {
              mocks.onStatus.mockImplementation(callback);
              mocks.subscribe();
              callback("SUBSCRIBED");
              return { id: "test-channel" };
            },
          };
        },
      };
    },
    removeChannel: (...args: unknown[]) => mocks.removeChannel(...args),
  }),
}));

describe("RealtimeUpdates", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.refresh.mockReset();
    mocks.onEvent.mockReset();
    mocks.onStatus.mockReset();
    mocks.subscribe.mockReset();
    mocks.removeChannel.mockReset();
    mocks.on.mockReset();
    mocks.channel.mockReset();
  });

  afterEach(() => cleanup());

  it("subscribes to the current organization and refreshes after an event", async () => {
    render(<RealtimeUpdates organizationId="org-123" />);

    expect((await screen.findByRole("status")).textContent).toContain("Live");
    expect(mocks.channel).toHaveBeenCalledWith("organization-events-org-123");
    expect(mocks.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "*",
        schema: "public",
        table: "events",
        filter: "organization_id=eq.org-123",
      }),
      expect.any(Function),
    );

    act(() => mocks.onEvent({ new: { id: "event-1" } }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1), {
      timeout: 1000,
    });
  });

  it("removes the channel when paused and refreshes when resumed", async () => {
    render(<RealtimeUpdates organizationId="org-123" />);

    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
    expect((await screen.findByRole("status")).textContent).toContain("Paused");
    await waitFor(() => expect(mocks.removeChannel).toHaveBeenCalledTimes(1));
    expect(mocks.refresh).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect((await screen.findByRole("status")).textContent).toContain("Live");
    await waitFor(() => expect(mocks.subscribe).toHaveBeenCalledTimes(2));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("recreates the subscription after browser connectivity returns", async () => {
    render(<RealtimeUpdates organizationId="org-123" />);
    expect((await screen.findByRole("status")).textContent).toContain("Live");

    act(() => window.dispatchEvent(new Event("offline")));
    expect(screen.getByRole("status").textContent).toContain("Reconnecting");

    act(() => window.dispatchEvent(new Event("online")));
    await waitFor(() => expect(mocks.subscribe).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("status").textContent).toContain("Live");
    expect(mocks.removeChannel).toHaveBeenCalledTimes(1);
  });
});
