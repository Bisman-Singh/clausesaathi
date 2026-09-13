"use client";

import Link from "next/link";
import { useT } from "@/components/locale-provider";

export default function NotFound() {
  const t = useT();
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold">{t("notFoundHeading")}</h1>
      <p>
        <Link href="/">{t("notFoundHome")}</Link>
      </p>
    </section>
  );
}
