"use client";

import { useId, useState } from "react";
import { useT } from "@/components/locale-provider";
import { Alert } from "@/components/ui/alert";
import {
  ELIGIBILITY_CATEGORIES,
  LEGAL_AID_SECTION_URL,
  NALSA_URL,
  assessEligibility,
  type EligibilityAnswers,
  type EligibilityCategoryId,
} from "@/lib/legal-aid/eligibility";
import type { TranslationKey } from "@/lib/i18n";

/** A self-check against Section 12 of the Legal Services Authorities Act. */
export function LegalAidPanel() {
  const t = useT();
  const id = useId();
  const [answers, setAnswers] = useState<EligibilityAnswers>({});
  const assessment = assessEligibility(answers);

  function toggle(category: EligibilityCategoryId, checked: boolean) {
    setAnswers({ ...answers, [category]: checked });
  }

  return (
    <div className="flex flex-col gap-3">
      <p>{t("legalAidIntro")}</p>
      <fieldset className="flex flex-col gap-2">
        <legend className="visually-hidden">{t("sectionLegalAid")}</legend>
        {ELIGIBILITY_CATEGORIES.map((category) => (
          <label key={category.id} className="flex items-start gap-2">
            <input
              id={`${id}-${category.id}`}
              type="checkbox"
              checked={answers[category.id] === true}
              onChange={(event) => toggle(category.id, event.target.checked)}
              className="mt-1 h-5 w-5"
            />
            <span>
              {t(`eligibility_${category.id}` as TranslationKey)}{" "}
              <span className="text-muted">{category.clause}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Alert tone={assessment.likelyEligible ? "ok" : "info"}>
        {assessment.likelyEligible ? t("legalAidEligible") : t("legalAidNotEligible")}
      </Alert>
      <p className="flex flex-wrap gap-4 text-sm">
        <a href={LEGAL_AID_SECTION_URL} rel="noopener">
          {t("legalAidReadSection")}
        </a>
        <a href={NALSA_URL} rel="noopener">
          {t("legalAidNalsa")}
        </a>
      </p>
    </div>
  );
}
