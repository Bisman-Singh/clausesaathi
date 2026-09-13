import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { ABOUT_CONTENT } from "@/lib/content/pages";

export const metadata: Metadata = { title: "How it works" };

export default function AboutPage() {
  return <ContentPage titleKey="aboutHeading" content={ABOUT_CONTENT} />;
}
