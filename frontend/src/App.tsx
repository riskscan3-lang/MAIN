// @ts-nocheck
import { useState } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Plans } from "./components/Plans";
import { MiningDashboard } from "./components/MiningDashboard";
import { Stats } from "./components/Stats";
import { Footer } from "./components/Footer";
import { AboutUs } from "./components/AboutUs";
import { FAQ } from "./components/FAQ";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { TermsOfService } from "./components/TermsOfService";
import { Contact } from "./components/Contact";
import { BuyPlanModal } from "./components/BuyPlanModal";
import { LiveTicker } from "./components/LiveTicker";
import { WalletProvider } from "./context/WalletContext";

export default function App() {
  const [activeView, setActiveView] = useState<string>("home");
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [buyPlanId, setBuyPlanId] = useState<number | null>(null);

  const handlePlanSelect = (planId: number) => {
    setSelectedPlan(planId);
    setBuyPlanId(planId);
  };

  const goToDashboard = () => {
    setBuyPlanId(null);
    setActiveView("dashboard");
  };

  const renderPage = () => {
    switch (activeView) {
      case "home":
        return (
          <>
            <Hero setActiveView={setActiveView} />
            <LiveTicker />
            <Plans onSelectPlan={handlePlanSelect} />
            <Stats />
          </>
        );
      case "dashboard":
        return <MiningDashboard planId={selectedPlan} />;
      case "about":
        return <AboutUs />;
      case "faq":
        return <FAQ />;
      case "privacy":
        return <PrivacyPolicy />;
      case "terms":
        return <TermsOfService />;
      case "contact":
        return <Contact />;
      default:
        return (
          <>
            <Hero setActiveView={setActiveView} />
            <LiveTicker />
            <Plans onSelectPlan={handlePlanSelect} />
            <Stats />
          </>
        );
    }
  };

  return (
    <WalletProvider>
      <div className="dark min-h-screen bg-slate-950 text-white relative overflow-x-hidden" data-testid="app-root">
        {/* Global ambient background mesh */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(249,115,22,0.15),transparent_60%)]" />
        </div>
        <Header activeView={activeView} setActiveView={setActiveView} />
        <main className="min-h-screen relative" data-testid={`view-${activeView}`}>
          {renderPage()}
        </main>
        <Footer setActiveView={setActiveView} />
        {buyPlanId !== null && (
          <BuyPlanModal
            planId={buyPlanId}
            onClose={() => setBuyPlanId(null)}
            onSuccess={goToDashboard}
          />
        )}
      </div>
    </WalletProvider>
  );
}
