import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataLoadError } from "@/components/ui/data-load-error";

describe("DataLoadError", () => {
  it("announces the load failure and recovery guidance to assistive technology", () => {
    render(<DataLoadError message="Data sources could not be loaded. Refresh the page and try again." />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Data sources could not be loaded.");
    expect(alert.textContent).toContain("Refresh the page and try again.");
  });
});
