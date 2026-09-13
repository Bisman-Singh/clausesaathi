import type { Metadata } from "next";
import { CompareWorkspace } from "@/components/compare/workspace";

export const metadata: Metadata = { title: "Compare two versions" };

export default function ComparePage() {
  return <CompareWorkspace />;
}
