import {
  FinalCtaSection,
  HeroSection,
  HowItWorksSection,
  MarketplacePreviewSection,
  PublicFooter,
  RolePathwaysSection,
  TrustStrip,
} from "@/components/public/landing-sections";
import { PublicNavbar } from "@/components/public/public-navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <PublicNavbar />
      <main id="main-content">
        <HeroSection />
        <TrustStrip />
        <HowItWorksSection />
        <RolePathwaysSection />
        <MarketplacePreviewSection />
        <FinalCtaSection />
      </main>
      <PublicFooter />
    </div>
  );
}
