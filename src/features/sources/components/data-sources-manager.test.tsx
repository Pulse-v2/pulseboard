import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataSourcesManager } from "@/features/sources/components/data-sources-manager";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DataSourcesManager", () => {
  it("shows a validation message instead of silently ignoring an empty source name", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<DataSourcesManager canManage initialSources={[]} organizationId="org-123" />);

    fireEvent.click(screen.getByRole("button", { name: /add source/i }));

    expect(screen.getByRole("alert").textContent).toContain("at least 2 characters");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
