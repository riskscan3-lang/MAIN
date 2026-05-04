// @ts-nocheck
import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Plans } from "./components/Plans";
import { ProfitCalculator } from "./components/ProfitCalculator";
import { MiningDashboard } from "./components/MiningDashboard";
import { Rewards } from "./components/Rewards";
import { AdminPanel } from "./components/AdminPanel";
import { Toaster } from "./components/ui/sonner";
import { Stats } from "./components/Stats";
import { Footer } from "./components/Footer";
import { AboutUs } from "./components/AboutUs";
import { FAQ } from "./components/FAQ";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { TermsOfService } from "./components/TermsOfService";
import { Contact } from "./components/Contact";
import { MyActivity } from "./components/MyActivity";
import { BuyPlanModal } from "./components/BuyPlanModal";
import { LiveTicker } from "./components/LiveTicker";
import { LiveChat } from "./components/LiveChat";
import { WalletProvider, useWallet } from "./context/WalletContext";
import { trackEvent, setTrackingWallet } from "./utils/analytics";

// Admin wallets allowed to access /admin view (from env, comma separated)
const ADMIN_WALLETS = (process.env.REACT_APP_ADMIN_WALLETS || "")
  .split(",")
  .map((a) => a.trim().toLowerCase())
  .filter(Boolean);

function AppShell() {
  const [activeView, setActiveView] = useState("home");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [buyPlanId, setBuyPlanId] = useState(null);
  const wallet = useWallet();
  const isAdmin = !!wallet.address && ADMIN_WALLETS.includes(wallet.address.toLowerCase());

  // Sync wallet → analytics + auto-track page_view on view change
  useEffect(() => { setTrackingWallet(wallet.address); }, [wallet.address]);
  useEffect(() => { trackEvent("page_view", activeView); }, [activeView]);

  // Capture ?ref=0x… on mount and persist for purchases (referrer attribution)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = (params.get("ref") || "").trim();
      if (/^0x[a-fA-F0-9]{40}$/.test(ref)) {
        localStorage.setItem("monerorig.referrer", ref.toLowerCase());
        trackEvent("referral_click", "home", { referrer: ref.toLowerCase() });
        // Clean the URL so the referrer doesn't stick on every share
        const url = new URL(window.location.href);
        url.searchParams.delete("ref");
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch (_) {}
  }, []);

  // The first time the wallet connects in this tab, take the user straight to
  // their dashboard so they immediately see their plans + earnings.
  const prevAddressRef = useState({ current: null })[0];
  useEffect(() => {
    if (wallet.address && !prevAddressRef.current) {
      prevAddressRef.current = wallet.address;
      // Avoid navigating if user is already deep in a flow (e.g. checkout modal open)
      if (!buyPlanId && (activeView === "home" || activeView === "plans")) {
        setActiveView("dashboard");
      }
    }
    if (!wallet.address) prevAddressRef.current = null;
  }, [wallet.address]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlanSelect = (planId) => {
    trackEvent("plan_buy_click", "plans", { plan_id: planId });
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
            <ProfitCalculator onSelectPlan={handlePlanSelect} />
            <Stats />
          </>
        );
      case "dashboard":
        return <MiningDashboard planId={selectedPlan} setActiveView={setActiveView} />;
      case "rewards":
        return <Rewards setActiveView={setActiveView} />;
      case "about":
        return <AboutUs setActiveView={setActiveView} />;
      case "faq":
        return <FAQ setActiveView={setActiveView} />;
      case "privacy":
        return <PrivacyPolicy />;
      case "terms":
        return <TermsOfService />;
      case "contact":
        return <Contact />;
      case "activity":
        return <MyActivity />;
      case "admin":
        return <AdminPanel adminWallets={ADMIN_WALLETS} />;
      default:
        return (
          <>
            <Hero setActiveView={setActiveView} />
            <LiveTicker />
            <Plans onSelectPlan={handlePlanSelect} />
            <ProfitCalculator onSelectPlan={handlePlanSelect} />
            <Stats />
          </>
        );
    }
  };

  return (
    <div className="dark min-h-screen bg-slate-950 text-white relative overflow-x-hidden" data-testid="app-root">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(249,115,22,0.15),transparent_60%)]" />
      </div>
      <Header activeView={activeView} setActiveView={setActiveView} isAdmin={isAdmin} />
      <main className="min-h-screen relative" data-testid={`view-${activeView}`}>
        {renderPage()}
      </main>
      <Footer setActiveView={setActiveView} />
      <LiveChat />
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "bg-slate-900 border border-orange-500/40 text-white",
          },
        }}
      />
      {buyPlanId !== null && (
        <BuyPlanModal
          planId={buyPlanId}
          onClose={() => setBuyPlanId(null)}
          onSuccess={goToDashboard}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AppShell />
    </WalletProvider>
  );
}
