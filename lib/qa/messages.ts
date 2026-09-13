import type { ModelMessage } from "ai";
import { LIMITS } from "@/lib/constants";

/** The shape of one chat turn as the client sends it. */
export interface ChatTurn {
  role: "user" | "assistant";
  parts: Array<{ type: string; text?: string }>;
}

/**
 * Chat turns as the model should see them: text only, questions capped, the
 * assistant's own earlier answers kept whole so follow-ups have context, and
 * turns with no text at all (a failed reply) left out.
 */
export function toModelMessages(messages: ChatTurn[]): ModelMessage[] {
  return messages.flatMap((message) => {
    const text = message.parts
      .filter((part) => part.type === "text" && part.text)
      .map((part) => part.text as string)
      .join("\n");
    if (text.length === 0) return [];
    const content = message.role === "user" ? text.slice(0, LIMITS.MAX_QUESTION_CHARS) : text;
    return [{ role: message.role, content }];
  });
}

/** What the client sees in an error chunk; provider messages never leave the server. */
export function hideModelError(): string {
  return "model_failed";
}
