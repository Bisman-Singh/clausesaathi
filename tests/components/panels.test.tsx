// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AskPanel } from "@/components/analyze/ask-panel";
import { LegalAidPanel } from "@/components/analyze/legal-aid-panel";
import { renderWithLocale } from "@/tests/components/helpers";

const chat = {
  messages: [] as Array<{
    id: string;
    role: string;
    parts: Array<{ type: string; text?: string }>;
  }>,
  sendMessage: vi.fn(),
  status: "ready",
  error: undefined as Error | undefined,
};

vi.mock("@ai-sdk/react", () => ({ useChat: () => chat }));

describe("LegalAidPanel", () => {
  it("reports likely eligibility once a category is ticked", async () => {
    renderWithLocale(<LegalAidPanel />);
    expect(screen.getByRole("status")).toHaveTextContent("None selected");
    await userEvent.click(screen.getByLabelText(/I am a woman or a child/));
    expect(screen.getByRole("status")).toHaveTextContent("may be eligible");
    expect(screen.getByRole("link", { name: "Read Section 12" })).toHaveAttribute(
      "href",
      expect.stringContaining("section/12"),
    );
  });
});

describe("AskPanel", () => {
  it("sends a trimmed question and clears the box", async () => {
    chat.messages = [];
    chat.status = "ready";
    renderWithLocale(<AskPanel documentText="doc" state="" />);
    const box = screen.getByLabelText("Ask a question about this document");
    expect(screen.getByRole("button", { name: "Ask" })).toBeDisabled();
    await userEvent.type(box, "  Can I leave early?  ");
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(chat.sendMessage).toHaveBeenCalledWith({ text: "Can I leave early?" });
    expect(box).toHaveValue("");
  });

  it("renders the conversation, a thinking state and errors", () => {
    chat.messages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "Q?" }] },
      {
        id: "2",
        role: "assistant",
        parts: [{ type: "text", text: "A." }, { type: "tool-lookupStatute" }],
      },
    ];
    chat.status = "streaming";
    chat.error = new Error("boom");
    renderWithLocale(<AskPanel documentText="doc" state="Kerala" />);
    expect(screen.getByText("Q?")).toBeInTheDocument();
    expect(screen.getByText("A.")).toBeInTheDocument();
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("busy right now");
    expect(screen.getByRole("button", { name: "Ask" })).toBeDisabled();
  });

  it("ignores an empty submission", () => {
    chat.messages = [];
    chat.status = "ready";
    chat.error = undefined;
    chat.sendMessage.mockClear();
    renderWithLocale(<AskPanel documentText="doc" state="" />);
    fireEvent.submit(
      screen.getByRole("button", { name: "Ask" }).closest("form") as HTMLFormElement,
    );
    expect(chat.sendMessage).not.toHaveBeenCalled();
  });

  it("ignores a submit while a reply is streaming", async () => {
    chat.messages = [];
    chat.status = "streaming";
    chat.error = undefined;
    chat.sendMessage.mockClear();
    renderWithLocale(<AskPanel documentText="doc" state="" />);
    await userEvent.type(screen.getByLabelText("Ask a question about this document"), "Q{enter}");
    expect(chat.sendMessage).not.toHaveBeenCalled();
  });
});
