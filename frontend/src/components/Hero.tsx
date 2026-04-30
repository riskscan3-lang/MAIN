// @ts-nocheck
import { Button } from "./ui/button";
import { Shield, Zap, TrendingUp, Play, ArrowRight, Star, Users } from "lucide-react";

export function Hero({ setActiveView }) {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/30 via-slate-950 to-slate-950"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-40 left-10 w-20 h-20 border border-orange-500/20 rounded-2xl rotate-12 animate-pulse"></div>
      <div className="absolute top-60 right-20 w-16 h-16 border border-amber-500/20 rounded-full animate-bounce"></div>
      <div className="absolute bottom-40 left-1/4 w-12 h-12 bg-orange-500/10 rounded-lg rotate-45"></div>
      
      <div className="max-w-7xl mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-full px-5 py-2 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm text-orange-300 font-medium">Live Mining Pool Active • 12,500+ Miners Online</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight tracking-tight">
              Mine{" "}
              <span className="relative">
                <span className="gradient-text-orange">
                  Monero
                </span>
                <svg className="absolute -bottom-2 left-0 w-full h-2" viewBox="0 0 200 10" preserveAspectRatio="none">
                  <path d="M0 5 Q50 0 100 5 T200 5" stroke="url(#gradient)" strokeWidth="2" fill="none" className="animate-pulse"/>
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316"/>
                      <stop offset="100%" stopColor="#fbbf24"/>
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <br />
              <span className="text-slate-200">with Professional</span>
              <br />
              <span className="text-slate-200">Hardware</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-xl mx-auto lg:mx-0">
              Join thousands of miners earning passive income through our state-of-the-art XMR mining infrastructure. 
              <span className="text-orange-400 font-medium"> No technical knowledge required.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12">
              <Button 
                size="lg" 
                data-testid="hero-start-mining"
                onClick={() => {
                  const el = document.getElementById("plans");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="group bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-8 py-7 text-lg shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all w-full sm:w-auto"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Mining Now
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                data-testid="hero-view-plans"
                onClick={() => {
                  const el = document.getElementById("plans");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 px-8 py-7 text-lg w-full sm:w-auto"
              >
                View Plans
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-slate-950 flex items-center justify-center text-xs font-bold text-slate-400">
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-slate-500">12,500+ users</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
                <span className="text-sm text-slate-500 ml-1">4.9/5 rating</span>
              </div>
            </div>
          </div>

          {/* Right Content - Stats Card */}
          <div className="relative animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-orange-500/40 via-amber-500/30 to-yellow-500/40 blur-2xl opacity-60 animate-pulse-glow" />
            <div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border border-orange-500/20 rounded-3xl p-8 shadow-2xl glow-border overflow-hidden">
              <div className="absolute inset-0 bg-grid-fade pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Live Pool Stats</h3>
                  <span className="flex items-center gap-2 text-sm text-green-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live
                  </span>
                </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Pool Hashrate</p>
                    <p className="text-2xl font-bold text-orange-400">2.4 GH/s</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Active Miners</p>
                    <p className="text-2xl font-bold text-blue-400">12,547</p>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm text-slate-500">Blocks Found (24h)</p>
                    <p className="text-lg font-bold text-amber-400">47 blocks</p>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full w-3/4 animate-pulse"></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">$18.5M</p>
                    <p className="text-xs text-slate-500">Total Paid</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-400">99.9%</p>
                    <p className="text-xs text-slate-500">Uptime</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-cyan-400">847K</p>
                    <p className="text-xs text-slate-500">XMR Mined</p>
                  </div>
                </div>
              </div>
              </div>
            </div>
            
            {/* Floating Badge */}
            <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg animate-float-y z-10">
              Hot Investment
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20">
          <div className="group bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-orange-500/50 transition-all hover:shadow-xl hover:shadow-orange-500/5">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Shield className="w-7 h-7 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure Storage</h3>
            <p className="text-slate-500">Cold wallet protection with multi-signature security for all funds.</p>
          </div>
          
          <div className="group bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/50 transition-all hover:shadow-xl hover:shadow-amber-500/5">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Payouts</h3>
            <p className="text-slate-500">Daily automatic withdrawals directly to your wallet address.</p>
          </div>
          
          <div className="group bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-yellow-500/50 transition-all hover:shadow-xl hover:shadow-yellow-500/5">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-7 h-7 text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">High ROI</h3>
            <p className="text-slate-500">Up to 14% monthly returns with transparent earnings tracking.</p>
          </div>
        </div>
      </div>
    </section>
  );
}