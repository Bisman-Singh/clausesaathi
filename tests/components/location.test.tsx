// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentForm, stateSourceFor } from "@/components/analyze/document-form";
import { LocationButton } from "@/components/analyze/location-button";
import { renderWithLocale } from "@/tests/components/helpers";

type Success = (position: { coords: { latitude: number; longitude: number } }) => void;
type Failure = (error: { code: number; PERMISSION_DENIED: number }) => void;

/** Stub the browser's geolocation with a canned outcome. */
function stubGeolocation(outcome: (ok: Success, fail: Failure) => void) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: vi.fn(outcome) },
  });
}

afterEach(() => {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
});

describe("LocationButton", () => {
  it("asks only when pressed and hands back the nearest state", async () => {
    stubGeolocation((ok) => ok({ coords: { latitude: 12.97, longitude: 77.59 } }));
    const onLocate = vi.fn();
    const { container } = renderWithLocale(<LocationButton onLocate={onLocate} />);
    expect(screen.getByText(/never sent anywhere/)).toBeInTheDocument();
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Use my location" }));
    expect(onLocate).toHaveBeenCalledWith("Karnataka");
    expect(screen.getByText(/State set from your location/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("explains a refusal, an unreadable position and a position outside India", async () => {
    stubGeolocation((_ok, fail) => fail({ code: 1, PERMISSION_DENIED: 1 }));
    const { rerender } = renderWithLocale(<LocationButton onLocate={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Use my location" }));
    expect(screen.getByText(/permission was refused/)).toBeInTheDocument();

    stubGeolocation((_ok, fail) => fail({ code: 2, PERMISSION_DENIED: 1 }));
    rerender(<LocationButton key="b" onLocate={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Use my location" }));
    expect(screen.getByText(/could not be read/)).toBeInTheDocument();

    stubGeolocation((ok) => ok({ coords: { latitude: 51.5, longitude: -0.1 } }));
    rerender(<LocationButton key="c" onLocate={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Use my location" }));
    expect(screen.getByText(/outside India/)).toBeInTheDocument();
  });

  it("says so when the browser has no geolocation at all, and shows progress while waiting", async () => {
    renderWithLocale(<LocationButton onLocate={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Use my location" }));
    expect(screen.getByText(/could not be read/)).toBeInTheDocument();

    stubGeolocation(() => undefined);
    renderWithLocale(<LocationButton onLocate={vi.fn()} />);
    const [, pending] = screen.getAllByRole("button", { name: "Use my location" });
    await userEvent.click(pending as HTMLElement);
    expect(screen.getByText("Finding your state…")).toBeInTheDocument();
    expect(pending).toBeDisabled();
  });
});

describe("DocumentForm with location", () => {
  it("uses the located state, sends it as such, and still lets the user override it", async () => {
    stubGeolocation((ok) => ok({ coords: { latitude: 19.08, longitude: 72.88 } }));
    const onSubmit = vi.fn();
    renderWithLocale(<DocumentForm busy={false} onSubmit={onSubmit} />);
    const select = screen.getByLabelText("Your state (optional)") as HTMLSelectElement;
    await userEvent.click(screen.getByRole("button", { name: "Rent agreement" }));
    expect(select.value).toBe("Karnataka");

    await userEvent.click(screen.getByRole("button", { name: "Use my location" }));
    await waitFor(() => expect(select.value).toBe("Maharashtra"));
    expect(select).toHaveAccessibleDescription(/From your location/);
    await userEvent.click(screen.getByRole("button", { name: "Explain this document" }));
    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: "Maharashtra", stateBasis: "location" }),
    );

    await userEvent.selectOptions(select, "Kerala");
    expect(select).toHaveAccessibleDescription(/Your choice is used/);
    await userEvent.click(screen.getByRole("button", { name: "Explain this document" }));
    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: "Kerala", stateBasis: "user" }),
    );
  });

  it("ranks the possible origins of the state value", () => {
    expect(stateSourceFor("Kerala", "Goa", "Pune")).toEqual({ kind: "user" });
    expect(stateSourceFor(null, "Goa", "Pune")).toEqual({ kind: "location" });
    expect(stateSourceFor(null, null, "Pune")).toEqual({ kind: "document", evidence: "Pune" });
    expect(stateSourceFor(null, null, null)).toEqual({ kind: "none" });
  });
});
