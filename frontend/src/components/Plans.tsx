// @ts-nocheck
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Check, Star, Crown, Rocket, Zap, Shield, Clock, Users, Layers } from "lucide-react";

interface Plan {
  id: number;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  workers: string;
  hashrate: string;
  price: string;
  priceNum: number;
  dailyEarnings: string;
  monthlyROI: string;
  contractDays: number;
  features: string[];
  popular?: boolean;
  color: string;
}

const plans: Plan[] = [
  {
    id: 1,
    name: "Pool Plan",
    tagline: "Shared mining for beginners",
    icon: <Layers className="w-6 h-6" />,
    workers: "1/10 Shared",
    hashrate: "2.5 KH/s share",
    price: "$250 USDT",
    priceNum: 250,
    dailyEarnings: "$0.85",
    monthlyROI: "10%",
    contractDays: 30,
    features: [
      "10 users share 1 worker",
      "Common pool to mine XMR",
      "Basic mining pool access",
      "Email support (48h response)",
      "Daily payouts",
      "30-day contract",
      "Real-time dashboard"
    ],
    color: "from-slate-500 to-slate-700"
  },
  {
    id: 2,
    name: "Solo Miner",
    tagline: "1 dedicated rig",
    icon: <Star className="w-6 h-6" />,
    workers: "1 Worker",
    hashrate: "25 KH/s",
    price: "$2,500 USDT",
    priceNum: 2500,
    dailyEarnings: "$8.32",
    monthlyROI: "10%",
    contractDays: 30,
    features: [
      "1 worker / 1 dedicated miner",
      "Basic mining pool access",
      "Email support (24h response)",
      "Daily payouts",
      "30-day contract",
      "Real-time dashboard",
      "Mobile app access"
    ],
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: 3,
    name: "Dual Miner",
    tagline: "2 dedicated rigs",
    icon: <Crown className="w-6 h-6" />,
    workers: "2 Workers",
    hashrate: "60 KH/s",
    price: "$5,000 USDT",
    priceNum: 5000,
    dailyEarnings: "$19.99",
    monthlyROI: "12%",
    contractDays: 60,
    features: [
      "2 workers / 2 dedicated miners",
      "Priority pool access",
      "24/7 live chat support",
      "Instant payouts",
      "60-day contract",
      "Performance bonuses",
      "Real-time dashboard",
      "Priority withdrawals",
      "Personal referral link"
    ],
    popular: true,
    color: "from-orange-500 to-amber-500"
  },
  {
    id: 4,
    name: "Multi Rig",
    tagline: "Up to 5 dedicated miners",
    icon: <Rocket className="w-6 h-6" />,
    workers: "5 Workers",
    hashrate: "150 KH/s",
    price: "$10,000 USDT",
    priceNum: 10000,
    dailyEarnings: "$50.00",
    monthlyROI: "15%",
    contractDays: 90,
    features: [
      "Up to 5 workers / 5 dedicated miners",
      "Dedicated mining pool",
      "Personal account manager",
      "Instant payouts",
      "90-day contract",
      "VIP bonuses (5% extra)",
      "Early access features",
      "Priority withdrawals",
      "API access",
      "Custom reporting"
    ],
    color: "from-purple-500 to-pink-500"
  }
];

interface PlansProps {
  onSelectPlan: (planId: number) => void;
}

export function Plans({ onSelectPlan }: PlansProps) {
  return (
    <section id="plans" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden" data-testid="plans-section">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-300">Limited Time Offer: Get 5% Bonus on First Deposit</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              Mining Plan
            </span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Select a plan that fits your investment goals. All plans include real-time mining stats, 
            guaranteed uptime, and instant withdrawals.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`relative group ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-orange-500/40 blur-md" />
                    <div className="relative bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-6 py-1.5 rounded-full shadow-lg overflow-hidden">
                      <span className="relative z-10">MOST POPULAR</span>
                      <span className="absolute inset-0 animate-shimmer" />
                    </div>
                  </div>
                </div>
              )}
              
              <Card 
                className={`relative bg-slate-900/80 backdrop-blur-sm border-2 transition-all duration-500 overflow-hidden hover:-translate-y-2 ${
                  plan.popular 
                    ? "border-orange-500 shadow-2xl shadow-orange-500/30 glow-border" 
                    : "border-slate-800 hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/10"
                }`}
              >
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`}></div>
                
                <CardHeader className="text-center pb-2 pt-8">
                  <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg ${
                    plan.popular 
                      ? "bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/30" 
                      : `bg-gradient-to-br ${plan.color} shadow-black/30`
                  }`}>
                    <span className="text-white">
                      {plan.icon}
                    </span>
                  </div>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">{plan.tagline}</p>
                  <CardDescription className="text-slate-500 flex items-center justify-center gap-2 mt-2">
                    <Zap className="w-4 h-4" />
                    {plan.hashrate}
                  </CardDescription>
                  <div className="inline-flex items-center gap-1.5 mt-3 mx-auto bg-slate-800/60 border border-slate-700 rounded-full px-3 py-1 text-xs text-slate-300">
                    <Users className="w-3 h-3 text-orange-400" />
                    {plan.workers}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 px-6 pb-8">
                  {/* Price */}
                  <div className="text-center py-4">
                    <div className="text-4xl font-bold mb-1">{plan.price}</div>
                    <div className="text-sm text-slate-500">one-time deposit</div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-800">
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-400">{plan.dailyEarnings}</div>
                      <div className="text-xs text-slate-500">Daily</div>
                    </div>
                    <div className="text-center border-x border-slate-800">
                      <div className="text-lg font-bold text-green-400">{plan.monthlyROI}</div>
                      <div className="text-xs text-slate-500">Monthly ROI</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-400">{plan.contractDays}d</div>
                      <div className="text-xs text-slate-500">Contract</div>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button 
                    onClick={() => onSelectPlan(plan.id)}
                    data-testid={`buy-plan-${plan.id}`}
                    className={`w-full py-6 font-semibold text-base transition-all ${
                      plan.popular 
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40" 
                        : "bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    Get Started with {plan.name}
                  </Button>
                  
                  <p className="text-center text-xs text-slate-600">
                    30-day money-back guarantee
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Bottom Info */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h4 className="font-semibold">Secure Investment</h4>
              <p className="text-sm text-slate-500">All funds protected by smart contracts</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold">Instant Activation</h4>
              <p className="text-sm text-slate-500">Start mining within minutes of deposit</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h4 className="font-semibold">24/7 Support</h4>
              <p className="text-sm text-slate-500">Expert help available around the clock</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}