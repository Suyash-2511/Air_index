// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanApiResponse } from "@/client/types";
import { PlanActions } from "@/components/plan";
import type { Household } from "@/lib/types";

describe("PlanActions extra branches", () => {
  const dummyHousehold: Household = {
    members: [{ id: "m-user", label: "You", ageBand: "adult", sensitivities: [], windows: [] }],
    home: { windowHabit: "open_often", hasPurifier: false, purifierRoom: "living", cookingFuel: "lpg", hasExhaustFan: false, smokingIndoors: false },
    location: { lat: 28.6139, lng: 77.209, label: "Lajpat Nagar, New Delhi" },
  };

  const dummyPlanData: PlanApiResponse = {
    baselineTotal: 250,
    baseline: [],
    ranked: [],
    air: { current: { hour: 8, pm25: 180 }, forecast: [{ hour: 8, pm25: 180 }] },
    demoMode: true,
  };

  let lastUtterance: { onend?: () => void; onerror?: () => void } | null = null;

  beforeEach(() => {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      writable: true,
      value: {
        speak: vi.fn((utt) => { lastUtterance = utt; }),
        cancel: vi.fn(),
        speaking: false,
      },
    });

    class MockUtterance {
      text: string;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      writable: true,
      value: MockUtterance,
    });

    Object.defineProperty(navigator, "share", {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("handles speech cancellation and speech end callbacks", async () => {
    const user = userEvent.setup();
    render(<PlanActions planData={dummyPlanData} household={dummyHousehold} currentTotal={200} />);

    const speakBtn = screen.getByRole("button", { name: /Read aloud/i });
    await user.click(speakBtn);
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);

    // Click again while speaking to cancel
    await user.click(speakBtn);
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();

    // Trigger end callback on new speech
    await user.click(speakBtn);
    if (lastUtterance?.onend) lastUtterance.onend();
  });

  it("handles share button when navigator.share is available", async () => {
    const user = userEvent.setup();
    render(<PlanActions planData={dummyPlanData} household={dummyHousehold} currentTotal={200} />);

    const shareBtn = screen.getByRole("button", { name: /Share/i });
    await user.click(shareBtn);
    expect(navigator.share).toHaveBeenCalled();
  });
});
