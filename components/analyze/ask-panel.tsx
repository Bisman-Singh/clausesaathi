"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useId, useMemo, useState, type FormEvent } from "react";
import { useLocale, useT } from "@/components/locale-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CONTROL_CLASS } from "@/components/ui/field";
import { LIMITS } from "@/lib/constants";

export interface AskPanelProps {
  /** The raw document text the answers must stay inside. */
  documentText: string;
  state: string;
}

function isTextPart(part: { type: string }): part is { type: "text"; text: string } {
  return part.type === "text";
}

/** Streaming Q&A over the document, with the statute tool on the server. */
export function AskPanel({ documentText, state }: AskPanelProps) {
  const t = useT();
  const { locale } = useLocale();
  const id = useId();
  const [question, setQuestion] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ask",
        body: { document: documentText, locale, state },
      }),
    [documentText, locale, state],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    void sendMessage({ text });
    setQuestion("");
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t("askHint")}</p>
      <ol className="flex flex-col gap-2" aria-live="polite" aria-busy={busy}>
        {messages.map((message) => (
          <li
            key={message.id}
            className={`rounded-md p-3 ${message.role === "user" ? "bg-info-bg text-info-text" : "border border-line bg-surface"}`}
          >
            <span className="visually-hidden">
              {message.role === "user" ? "You" : t("appName")}:{" "}
            </span>
            {message.parts.filter(isTextPart).map((part, index) => (
              <p key={index} className="whitespace-pre-wrap">
                {part.text}
              </p>
            ))}
          </li>
        ))}
        {busy ? <li className="text-sm text-muted">{t("askThinking")}</li> : null}
      </ol>
      {error ? (
        <Alert tone="danger" role="alert">
          {t("errorAiUnavailable")}
        </Alert>
      ) : null}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-question`} className="visually-hidden">
          {t("askPlaceholder")}
        </label>
        <input
          id={`${id}-question`}
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t("askPlaceholder")}
          maxLength={LIMITS.MAX_QUESTION_CHARS}
          className={`${CONTROL_CLASS} min-h-11 flex-1`}
        />
        <Button type="submit" disabled={busy || question.trim().length === 0}>
          {t("askSubmit")}
        </Button>
      </form>
    </div>
  );
}
