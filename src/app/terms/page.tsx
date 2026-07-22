import type { Metadata } from "next";
import { InfoPage } from "@/components/public/info-page";

export const metadata: Metadata = { title: "Pilot terms" };

export default function TermsPage() {
  return <InfoPage kind="terms" />;
}
