import { Hero } from "@/components/hero/Hero";
import { BenefitsSection } from "@/components/sections/BenefitsSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { WhenToUseSection } from "@/components/sections/WhenToUseSection";
import { TokensSection } from "@/components/sections/TokensSection";
import { AudiencesSection } from "@/components/sections/AudiencesSection";
import { TrustNoticeSection } from "@/components/sections/TrustNoticeSection";
import { FinalCtaSection } from "@/components/sections/FinalCtaSection";
import { CreditsSection } from "@/components/sections/CreditsSection";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <BenefitsSection />
      <HowItWorksSection />
      <WhenToUseSection />
      <TokensSection />
      <AudiencesSection />
      <TrustNoticeSection />
      <FinalCtaSection />
      <CreditsSection />
    </main>
  );
}
