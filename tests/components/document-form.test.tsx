// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import { DocumentForm, validateInput } from "@/components/analyze/document-form";
import { LIMITS } from "@/lib/constants";
import { RENT_AGREEMENT_V1 } from "@/lib/samples";
import { renderWithLocale } from "@/tests/components/helpers";

describe("validateInput", () => {
  it("returns the right error key for each failure and null when usable", () => {
    const bigFile = {
      size: LIMITS.MAX_UPLOAD_BYTES + 1,
      type: "application/pdf",
      name: "big.pdf",
    } as File;
    const smallFile = { size: 10, type: "application/pdf", name: "a.pdf" } as File;
    expect(validateInput("", null)).toBe("errorEmpty");
    expect(validateInput("short", null)).toBe("errorTooShort");
    expect(validateInput("x".repeat(LIMITS.MAX_DOCUMENT_CHARS + 1), null)).toBe("errorTooLong");
    expect(validateInput("", bigFile)).toBe("errorFileTooLarge");
    expect(validateInput("", { size: 10, type: "", name: "notes.docx" } as File)).toBe(
      "errorUnsupportedFile",
    );
    expect(validateInput("", { size: 10, type: "", name: "scan.JPG" } as File)).toBeNull();
    expect(validateInput("", smallFile)).toBeNull();
    expect(validateInput("x".repeat(LIMITS.MIN_DOCUMENT_CHARS), null)).toBeNull();
  });
});

describe("DocumentForm", () => {
  it("blocks an empty submission with an announced error and no axe violations", async () => {
    const onSubmit = vi.fn();
    const { container } = renderWithLocale(<DocumentForm busy={false} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Explain this document" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please paste some text");
    expect(screen.getByLabelText("Document text")).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("fills the text from a sample, clears the error, and submits trimmed values", async () => {
    const onSubmit = vi.fn();
    renderWithLocale(<DocumentForm busy={false} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Explain this document" }));
    await userEvent.selectOptions(screen.getByLabelText("Or try a sample"), "rent-agreement");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByLabelText("Document text")).toHaveValue(RENT_AGREEMENT_V1);
    await userEvent.type(screen.getByLabelText("Your situation (optional)"), "  tenant  ");
    await userEvent.selectOptions(screen.getByLabelText("Your state (optional)"), "Karnataka");
    await userEvent.click(screen.getByRole("button", { name: "Explain this document" }));
    expect(onSubmit).toHaveBeenCalledWith({
      text: RENT_AGREEMENT_V1,
      file: null,
      situation: "tenant",
      state: "Karnataka",
    });
    await userEvent.selectOptions(screen.getByLabelText("Or try a sample"), "");
    expect(screen.getByLabelText("Document text")).toHaveValue("");
  });

  it("accepts a PDF without text and rejects an oversized one", async () => {
    const onSubmit = vi.fn();
    renderWithLocale(<DocumentForm busy={false} onSubmit={onSubmit} />);
    const input = screen.getByLabelText("Or upload a PDF or a photo") as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "a.pdf", { type: "application/pdf" });
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole("button", { name: "Explain this document" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ file, text: "" }));

    const big = new File([new Uint8Array(LIMITS.MAX_UPLOAD_BYTES + 1)], "big.pdf", {
      type: "application/pdf",
    });
    await userEvent.upload(input, big);
    await userEvent.click(screen.getByRole("button", { name: "Explain this document" }));
    expect(screen.getByRole("alert")).toHaveTextContent("larger than 8 MB");

    fireEvent.change(input, { target: { files: [] } });
    await userEvent.click(screen.getByRole("button", { name: "Explain this document" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please paste some text");
  });

  it("guesses the state from the document until the user picks one", async () => {
    const onSubmit = vi.fn();
    renderWithLocale(<DocumentForm busy={false} onSubmit={onSubmit} />);
    const select = screen.getByLabelText("Your state (optional)") as HTMLSelectElement;
    expect(select.value).toBe("");
    await userEvent.selectOptions(screen.getByLabelText("Or try a sample"), "employment-offer");
    expect(select.value).toBe("Maharashtra");
    expect(select).toHaveAccessibleDescription(
      "Guessed from the document (Pune). Change it if that is wrong.",
    );

    await userEvent.selectOptions(select, "Kerala");
    expect(select).not.toHaveAccessibleDescription(/Guessed/);
    await userEvent.selectOptions(screen.getByLabelText("Or try a sample"), "rent-agreement");
    expect(select.value).toBe("Kerala");
    await userEvent.click(screen.getByRole("button", { name: "Explain this document" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ state: "Kerala" }));
  });

  it("submits typed text once it is long enough", async () => {
    const onSubmit = vi.fn();
    renderWithLocale(<DocumentForm busy={false} onSubmit={onSubmit} />);
    const text =
      "This agreement is made between two parties and runs for eleven months from today.";
    await userEvent.type(screen.getByLabelText("Document text"), text);
    await userEvent.click(screen.getByRole("button", { name: "Explain this document" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ text }));
  });

  it("disables the button and shows progress text while busy", () => {
    renderWithLocale(<DocumentForm busy onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Reading the document…" })).toBeDisabled();
  });
});
