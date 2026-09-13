// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Section } from "@/components/ui/section";

describe("ui primitives", () => {
  it("renders buttons in both variants", () => {
    render(
      <>
        <Button>Go</Button>
        <Button variant="secondary">Back</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Go" }).className).toContain("bg-accent");
    expect(screen.getByRole("button", { name: "Back" }).className).toContain("border");
  });

  it("wires label, hint and error to the control", async () => {
    const { container, rerender } = render(
      <Field id="doc" label="Document" hint="Paste it" error="Required">
        {(describedBy, invalid) => (
          <input id="doc" aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>,
    );
    const input = screen.getByLabelText("Document");
    expect(input).toHaveAttribute("aria-describedby", "doc-hint doc-error");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(await axe(container)).toHaveNoViolations();

    rerender(
      <Field id="doc" label="Document">
        {(describedBy, invalid) => (
          <input id="doc" aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>,
    );
    expect(screen.getByLabelText("Document")).not.toHaveAttribute("aria-describedby");
  });

  it("renders alerts with the requested role and tone, and labelled sections", () => {
    render(
      <>
        <Alert tone="danger" role="alert">
          Bad
        </Alert>
        <Alert>Fine</Alert>
        <Section id="s" title="Title">
          <p>Body</p>
        </Section>
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Bad");
    expect(screen.getByRole("status")).toHaveTextContent("Fine");
    expect(screen.getByRole("region", { name: "Title" })).toBeInTheDocument();
  });
});
