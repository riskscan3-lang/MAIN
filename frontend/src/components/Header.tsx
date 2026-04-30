// @ts-nocheck
import { Button } from "./ui/button";
import { Pickaxe, Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { ConnectWalletButton } from "./ConnectWalletButton";

interface HeaderProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export function Header({ activeView, setActiveView }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "dashboard", label: "Dashboard" },
    { id: "about", label: "About Us" },
    { id: "faq", label: "FAQ" },
    { id: "contact", label: "Contact" },
  ];

  const resourceItems = [
    { id: "privacy", label: "Privacy Policy" },
    { id: "terms", label: "Terms of Service" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-orange-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <button 
            onClick={() => setActiveView("home")}
            className="flex items-center gap-3 group"
          >
            <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-2.5 rounded-xl shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/40 transition-all">
              <Pickaxe className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 bg-clip-text text-transparent tracking-tight">
                MONERO RIG
              </span>
              <p className="text-[10px] text-slate-500 -mt-1 tracking-[0.2em] uppercase">Cloud Mining</p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" data-testid="desktop-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                data-testid={`nav-${item.id}`}
                onClick={() => setActiveView(item.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeView === item.id
                    ? "bg-orange-500/20 text-orange-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                {item.label}
              </button>
            ))}
            
            {/* Resources Dropdown */}
            <div className="relative">
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
              >
                Resources
                <ChevronDown className={`w-4 h-4 transition-transform ${resourcesOpen ? "rotate-180" : ""}`} />
              </button>
              
              {resourcesOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
                  {resourceItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveView(item.id);
                        setResourcesOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={() => setActiveView("dashboard")}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
              data-testid="header-dashboard-cta"
            >
              View Dashboard
            </Button>
            <ConnectWalletButton />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-slate-400 hover:text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-orange-500/20">
          <div className="px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeView === item.id
                    ? "bg-orange-500/20 text-orange-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                {item.label}
              </button>
            ))}
            
            <div className="pt-2 border-t border-slate-800 mt-2">
              <p className="px-4 py-2 text-xs text-slate-600 uppercase tracking-wider">Legal</p>
              {resourceItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/50"
                >
                  {item.label}
                </button>
              ))}
            </div>
            
            <div className="pt-4 space-y-2">
              <ConnectWalletButton compact />
              <Button 
                onClick={() => {
                  setActiveView("dashboard");
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold"
              >
                View Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}