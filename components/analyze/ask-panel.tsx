"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useId, useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { useLocale, useT } from "@/components/locale-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CONTROL_CLASS } from "@/components/ui/field";
import { CitedText } from "@/components/analyze/cited-text";
import { LIMITS } from "@/lib/constants";
import type { ParsedDocument } from "@/lib/document/types";

export interface AskPanelProps {
  /** The raw document text the answers must stay inside. */
  documentText: string;
  /** The parsed clauses, so `[c3]` in an answer becomes a link. */
  document: ParsedDocument;
  state: string;
}

// zod probes `Function("")` to decide whether it may compile fast paths; under the
// strict CSP that probe is a reported violation, so it is switched off here.
z.config({ jitless: true });

function isTextPart(part: { type: string }): part is { type: "text"; text: string } {
  return part.type === "text";
}

interface StatuteToolPart {
  type: "tool-lookupStatute";
  output?: { found: boolean; act?: string; section?: string; url?: string };
}

function isStatutePart(part: { type: string }): part is StatuteToolPart {
  return part.type === "tool-lookupStatute";
}

/** What the statute tool returned for this answer, so the reader sees the source too. */
function StatuteSources({ parts }: { parts: Array<{ type: string }> }) {
  const t = useT();
  const found = parts.filter(isStatutePart).filter((part) => part.output?.found && part.output.url);
  if (found.length === 0) return null;
  return (
    <p className="mt-2 text-sm text-muted">
      <span className="font-medium">{t("askSources")}: </span>
      {found.map((part, index) => (
        <span key={index}>
          {index > 0 ? "; " : ""}
          <a href={part.output?.url} rel="noopener">
            {part.output?.act}, {part.output?.section}
          </a>
        </span>
      ))}
    </p>
  );
}

/** Streaming Q&A over the document, with the statute tool on the server. */
export function AskPanel({ documentText, document, state }: AskPanelProps) {
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
      <p className="visually-hidden" aria-live="polite">
        {status === "ready" && messages.length > 0 ? t("askAnswered") : ""}
      </p>
      <ol className="flex flex-col gap-2" aria-busy={busy}>
        {messages.map((message) => (
          <li
            key={message.id}
            className={`rounded-md p-3 ${message.role === "user" ? "bg-info-bg text-info-text" : "border border-line bg-surface"}`}
          >
            <span className="visually-hidden">
              {message.role === "user" ? t("askYou") : t("appName")}:{" "}
            </span>
            {message.parts.filter(isTextPart).map((part, index) => (
              <p key={index} className="whitespace-pre-wrap break-words">
                {message.role === "user" ? (
                  part.text
                ) : (
                  <CitedText text={part.text} document={document} />
                )}
              </p>
            ))}
            {message.role === "assistant" ? <StatuteSources parts={message.parts} /> : null}
          </li>
        ))}
        {busy ? <li className="text-sm text-muted">{t("askThinking")}</li> : null}
      </ol>
      {error ? (
        <Alert tone="danger" role="alert">
          {t("errorAiUnavailable")}
        </Alert>
      ) : null}
      <QuestionForm
        id={`${id}-question`}
        question={question}
        busy={busy}
        onChange={setQuestion}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

interface QuestionFormProps {
  id: string;
  question: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/** One labelled box and an Ask button; hidden when printing the brief. */
function QuestionForm({ id, question, busy, onChange, onSubmit }: QuestionFormProps) {
  const t = useT();
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 print:hidden sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor={id} className="font-medium">
          {t("askLabel")}
        </label>
        <input
          id={id}
          type="text"
          value={question}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("askPlaceholder")}
          maxLength={LIMITS.MAX_QUESTION_CHARS}
          className={`${CONTROL_CLASS} min-h-11`}
        />
      </div>
      <Button type="submit" aria-disabled={busy || question.trim().length === 0}>
        {t("askSubmit")}
      </Button>
    </form>
  );
}
