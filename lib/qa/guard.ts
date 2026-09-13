import type { Locale } from "@/lib/constants";

/**
 * Deterministic guards around the Q&A model.
 *
 * The model is told to answer only from the document, but a prompt is a
 * request, not a boundary. Two cheap checks run outside the model: the
 * question is screened for text that tries to re-instruct the assistant, and
 * every answer is checked for the shape a grounded answer must have (at least
 * one clause citation, or an explicit "not covered"). Neither check is a
 * language model, so neither can be talked out of its decision.
 */

/** Phrases that address the assistant rather than the document, in either language. */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore (?:all |the |any )?(?:previous|prior|above|earlier) (?:instructions?|prompts?|rules?)/i,
  /disregard (?:the |your )?(?:instructions?|rules?|system prompt)/i,
  /(?:reveal|print|show|repeat|output) (?:your |the )?(?:system|hidden|initial) (?:prompt|instructions?)/i,
  /\byou are now\b|\bact as\b|\bpretend (?:to be|you are)\b|\bjailbreak\b|\bdeveloper mode\b/i,
  /\bnew instructions?\b|\boverride (?:your|the) (?:rules|instructions)/i,
  /पिछले (?:निर्देश|आदेश)(?:ों)? (?:को )?(?:भूल|अनदेखा|नज़रअंदाज़)/,
  /सिस्टम प्रॉम्प्ट/,
];

/** Whether the question tries to change what the assistant is, rather than ask about the document. */
export function isInjectionAttempt(question: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(question));
}

const CLAUSE_TAG = /\[c\d+\]/;
const NOT_COVERED: Record<Locale, RegExp> = {
  en: /not cover|does not (?:say|mention|address|deal)|doesn't (?:say|mention|address)|no (?:clause|provision|information)|outside (?:this|the) document|cannot answer|can only answer/i,
  hi: /नहीं (?:बताता|कहता|शामिल|मिलता)|दस्तावेज़ में नहीं|केवल (?:इस )?दस्तावेज़|उत्तर नहीं दे सकत/,
};

/**
 * A grounded answer either cites a clause or says the document does not cover
 * the point. Anything else is the model drifting, and is not shown.
 */
export function looksGrounded(answer: string, locale: Locale): boolean {
  if (answer.trim().length === 0) return true;
  return CLAUSE_TAG.test(answer) || NOT_COVERED[locale].test(answer) || NOT_COVERED.en.test(answer);
}

/** Appended to an answer that ended without citing the document or saying it does not cover the point. */
export const UNGROUNDED_NOTE: Record<Locale, string> = {
  en: "Note: this answer did not point to any clause of your document, so treat it as general information and check the clauses yourself.",
  hi: "ध्यान दें: इस उत्तर में आपके दस्तावेज़ के किसी खंड का हवाला नहीं है, इसलिए इसे सामान्य जानकारी मानें और खंड खुद जाँचें।",
};

/** The reply shown instead of an answer that failed a guard. */
export const REFUSAL: Record<Locale, string> = {
  en: "I can only answer questions about this document, using what it says and the law fetched from IndiaCode. Please ask about a clause, a deadline, a risk or your options under it.",
  hi: "मैं केवल इस दस्तावेज़ के बारे में, उसकी बातों और IndiaCode से लाए गए कानून के आधार पर उत्तर दे सकता हूँ। कृपया किसी खंड, समय-सीमा, जोखिम या उसके तहत अपने विकल्पों के बारे में पूछें।",
};
