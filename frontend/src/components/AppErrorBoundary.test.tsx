// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { logger } from "../lib/logger";

function BrokenComponent(): JSX.Element {
  throw new Error("private internal stack details");
}

describe("AppErrorBoundary", () => {
  it("shows a friendly fallback and reports the component error", () => {
    const capture = vi.spyOn(logger, "captureException").mockImplementation(() => undefined);
    const originalConsoleError = console.error;
    console.error = () => undefined;
    const { getByRole, queryByText } = render(<AppErrorBoundary><BrokenComponent /></AppErrorBoundary>);

    expect(getByRole("alert").textContent).toContain("Something went wrong");
    expect(queryByText("private internal stack details")).toBeNull();
    expect(capture).toHaveBeenCalledWith(expect.any(Error), { category: "react" });
    console.error = originalConsoleError;
  });
});
