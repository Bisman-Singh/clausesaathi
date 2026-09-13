import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { ACCESSIBILITY_CONTENT } from "@/lib/content/pages";

export const metadata: Metadata = { title: "Accessibility" };

export default function AccessibilityPage() {
  return <ContentPage titleKey="accessibilityHeading" content={ACCESSIBILITY_CONTENT} />;
}
