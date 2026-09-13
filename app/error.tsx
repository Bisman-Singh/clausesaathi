"use client";

import { useT } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";

/** Route-level error boundary; never shows internal details. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <section role="alert" className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold">{t("errorGeneric")}</h1>
      <div>
        <Button type="button" onClick={reset}>
          {t("formSubmit")}
        </Button>
      </div>
    </section>
  );
}
