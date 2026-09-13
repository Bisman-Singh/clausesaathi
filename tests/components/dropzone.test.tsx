// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import { Dropzone, formatBytes } from "@/components/ui/dropzone";
import { renderWithLocale } from "@/tests/components/helpers";

const file = new File([new Uint8Array(2048)], "scan.jpg", { type: "image/jpeg" });

describe("formatBytes", () => {
  it("picks a sensible unit", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.5 * 1024 * 1024)).toBe("3.5 MB");
  });
});

describe("Dropzone", () => {
  it("opens the picker from its button, shows the chosen file, and can remove it", async () => {
    const onChange = vi.fn();
    const { container, rerender } = renderWithLocale(
      <Dropzone
        id="f"
        label="Or upload"
        hint="PDF or photo"
        accept="image/*"
        file={null}
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText("Or upload") as HTMLInputElement;
    const click = vi.spyOn(input, "click");
    await userEvent.click(screen.getByRole("button", { name: "Choose a file" }));
    expect(click).toHaveBeenCalled();
    expect(screen.getByText("or drop it here")).toBeInTheDocument();
    await userEvent.upload(input, file);
    expect(onChange).toHaveBeenCalledWith(file);

    rerender(
      <Dropzone
        id="f"
        label="Or upload"
        hint="PDF or photo"
        accept="image/*"
        file={file}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("scan.jpg (2 KB)")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("lights up while a file is dragged over it and accepts the drop", () => {
    const onChange = vi.fn();
    const { container } = renderWithLocale(
      <Dropzone
        id="f"
        label="Or upload"
        hint="h"
        accept="image/*"
        file={null}
        onChange={onChange}
      />,
    );
    const zone = container.querySelector(".border-dashed") as HTMLElement;
    fireEvent.dragOver(zone, { dataTransfer: { files: [file] } });
    expect(screen.getByText("Drop to attach")).toBeInTheDocument();
    fireEvent.dragLeave(zone, { dataTransfer: { files: [] } });
    expect(screen.getByText("or drop it here")).toBeInTheDocument();
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith(file);
    fireEvent.drop(zone, { dataTransfer: { files: [] } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
