// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocaleProvider, useLocale } from "@/hooks/useLocale";

function TestConsumer() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div>
      <span data-testid="current-locale">{locale}</span>
      <span data-testid="trans-step">{t("step1_nav")}</span>
      <button type="button" onClick={() => setLocale(locale === "en" ? "hi" : "en")}>
        Toggle
      </button>
    </div>
  );
}

describe("useLocale hook & LocaleProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "en";
  });

  afterEach(() => {
    cleanup();
  });

  it("defaults to en and updates html lang attribute", () => {
    render(
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("current-locale").textContent).toBe("en");
    expect(screen.getByTestId("trans-step").textContent).toBe("Where are you?");
    expect(document.documentElement.lang).toBe("en");
  });

  it("switches to Hindi, updates html lang attribute and persists in localStorage", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>,
    );

    const btn = screen.getByRole("button", { name: /Toggle/i });
    await user.click(btn);

    expect(screen.getByTestId("current-locale").textContent).toBe("hi");
    expect(screen.getByTestId("trans-step").textContent).toBe("आप कहाँ रहते हैं?");
    expect(document.documentElement.lang).toBe("hi");
    expect(localStorage.getItem("saans_locale")).toBe("hi");
  });

  it("initializes with saved localStorage locale if present", () => {
    localStorage.setItem("saans_locale", "hi");

    render(
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("current-locale").textContent).toBe("hi");
    expect(document.documentElement.lang).toBe("hi");
  });
});
