import type { Metadata } from "next";
import { InfoPage } from "@/components/public/info-page";

export const metadata: Metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return <InfoPage kind="privacy" />;
}
