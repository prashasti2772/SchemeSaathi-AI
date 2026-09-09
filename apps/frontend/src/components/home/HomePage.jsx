import React from "react";
import { MainLayout } from "../layout";
import HeroSection from "./HeroSection";
import StatsSection from "./StatsSection";
import AudienceSection from "./AudienceSection";

export default function HomePage() {
  return (
    <MainLayout>
      <HeroSection />
      <StatsSection />
      <AudienceSection />
    </MainLayout>
  );
}
