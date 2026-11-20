import React from "react";
import { MainLayout } from "../layout";
import HeroSection from "./HeroSection";
import StatsSection from "./StatsSection";
import AudienceSection from "./AudienceSection";
import DiscoverySections from "./DiscoverySections";

export default function HomePage() {
  return (
    <MainLayout>
      <HeroSection />
      <StatsSection />
      <AudienceSection />
      <DiscoverySections />
    </MainLayout>
  );
}
