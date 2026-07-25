import { AstronautGuide } from "@/components/astronaut/AstronautGuide";
import { Hero } from "@/components/hero/Hero";
import { WhatIsSection } from "@/components/sections/WhatIsSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { AudiencesSection } from "@/components/sections/AudiencesSection";
import { DifferentiatorsSection } from "@/components/sections/DifferentiatorsSection";
import { TrustNoticeSection } from "@/components/sections/TrustNoticeSection";
import { FinalCtaSection } from "@/components/sections/FinalCtaSection";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <AstronautGuide />
      <Hero />
      <WhatIsSection />
      <HowItWorksSection />
      <AudiencesSection />
      <DifferentiatorsSection />
      <TrustNoticeSection />
      <FinalCtaSection />
    </main>
  );
}
