import 'server-only';

import { HeroSection } from '@/app/(frontpage)/landingpage/HeroSection';
import { FeaturesSection } from '@/app/(frontpage)/landingpage/FeaturesSection';
import { HowItWorksSection } from '@/app/(frontpage)/landingpage/HowItWorksSection';
import { UseCasesSection } from '@/app/(frontpage)/landingpage/UseCasesSection';
import { CTASection } from '@/app/(frontpage)/landingpage/CTASection';
import { getSession } from '@/lib/server/supabase';

export default async function LandingPage() {
  const session = await getSession();
  const isLoggedIn = !!session?.sub;
  
  return (
    <>
      <HeroSection session={isLoggedIn} />
      <FeaturesSection />
      <HowItWorksSection />
      <UseCasesSection />
      <CTASection />
    </>
  );
}
