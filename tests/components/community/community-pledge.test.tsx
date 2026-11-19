// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { CommunityPledge } from "@/components/community";

expect.extend(matchers);

describe("CommunityPledge Component", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders with zero axe violations", async () => {
    const { container } = render(<CommunityPledge areaLabel="South Delhi" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("toggles checkboxes and copies pledge text", async () => {
    const user = userEvent.setup();
    const writeSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText: writeSpy },
    });
    const onPledgesChanged = vi.fn();

    render(<CommunityPledge areaLabel="South Delhi" onPledgesChanged={onPledgesChanged} />);

    const metroCheckbox = screen.getByRole("checkbox", {
      name: /Carpool or take the metro at least twice a week/i,
    });
    await user.click(metroCheckbox);
    expect(onPledgesChanged).toHaveBeenCalled();

    const shareBtn = screen.getByRole("button", { name: /Share pledge/i });
    await user.click(shareBtn);

    expect(writeSpy).toHaveBeenCalled();
    expect(screen.getByText(/Pledge copied to clipboard/i)).toBeDefined();
  });
});
