import type { Metadata } from "next";
import { InfoPage } from "@/components/public/info-page";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return <InfoPage kind="support" />;
}
