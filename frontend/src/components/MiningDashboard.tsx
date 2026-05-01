// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Pickaxe, Clock, Wallet, Activity, Cpu, Zap, ArrowRight } from "lucide-react";
import { XmrPriceChart } from "./XmrPriceChart";
import { WorkerPool } from "./WorkerPool";
import { MiningLogs } from "./MiningLogs";

interface MiningDashboardProps {
  planId: number | null;
}

const plans = [
  {
    id: 1,
    name: "Starter",
    hashrate: "25000",
    price: "$2,499 USDT",
    dailyEarnings: 8.32,
    monthlyROI: "10%"
  },
  {
    id: 2,
    name: "Professional",
    hashrate: "60000",
    price: "$4,999 USDT",
    dailyEarnings: 19.99,
    monthlyROI: "12%"
  },
  {
    id: 3,
    name: "Enterprise",
    hashrate: "120000",
    price: "$8,499 USDT",
    dailyEarnings: 39.95,
    monthlyROI: "14%"
  }
];

export function MiningDashboard({ planId }: MiningDashboardProps) {
  const [hashrate, setHashrate] = useState(0);
  const [usdtEarned, setUsdtEarned] = useState(0);
  const [uptime, setUptime] = useState(0);
  const [blocks, setBlocks] = useState(0);
  const [isMining, setIsMining] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const selectedPlan = plans.find(p => p.id === planId) || plans[1];

  useEffect(() => {
    if (!isMining) return;

    const interval = setInterval(() => {
      setHashrate(prev => {
        const target = parseInt(selectedPlan.hashrate);
        return prev < target ? prev + Math.floor(Math.random() * 500) + 100 : target;
      });
      
      setUsdtEarned(prev => prev + (selectedPlan.dailyEarnings / 86400) * 0.1);
      setUptime(prev => Math.min(prev + 0.1, 99.99));
      setTimeElapsed(prev => prev + 1);
      
      if (Math.random() > 0.97) {
        setBlocks(prev => prev + 1);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isMining, selectedPlan]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Mining Dashboard</h1>
          <p className="text-slate-400">Real-time monitoring of your XMR mining operation</p>
        </div>

        <div className={`mb-8 p-4 rounded-xl border flex items-center justify-between ${
          isMining 
            ? "bg-green-500/10 border-green-500/30" 
            : "bg-amber-500/10 border-amber-500/30"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isMining ? "bg-green-500 animate-pulse" : "bg-amber-500"}`}></div>
            <span className="font-medium">{isMining ? "Mining Active" : "Ready to Start Mining"}</span>
            <span className="text-sm text-slate-400">| Plan: {selectedPlan.name}</span>
          </div>
          <Button 
            onClick={() => setIsMining(!isMining)}
            className={isMining ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
          >
            {isMining ? "Stop Mining" : "Start Mining"}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-sm">Current Hashrate</span>
                <Cpu className="w-5 h-5 text-orange-400" />
              </div>
              <div className="text-3xl font-bold text-orange-400">{hashrate.toLocaleString()}</div>
              <div className="text-sm text-slate-500">H/s</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-sm">USDT Earned</span>
                <Wallet className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-green-400">${usdtEarned.toFixed(4)}</div>
              <div className="text-sm text-slate-500">Total earnings</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-sm">Uptime</span>
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-blue-400 tabular-nums" data-testid="uptime-value">{formatTime(timeElapsed)}</div>
              <div className="text-sm text-slate-500">This session</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-sm">Blocks Found</span>
                <Pickaxe className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-3xl font-bold text-amber-400">{blocks}</div>
              <div className="text-sm text-slate-500">This session</div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time XMR Price Chart — breaks out of the max-w-7xl frame on large screens */}
        <div className="mb-6 lg:-mx-6 xl:-mx-16 2xl:-mx-28">
          <XmrPriceChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-400" />
                Live Mining Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiningLogs running={isMining} />
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isMining ? (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Share Accepted</div>
                        <div className="text-xs text-slate-500">2 seconds ago</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Hash Submitted</div>
                        <div className="text-xs text-slate-500">5 seconds ago</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Difficulty Updated</div>
                        <div className="text-xs text-slate-500">1 minute ago</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Share Accepted</div>
                        <div className="text-xs text-slate-500">1 minute ago</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p>No recent activity</p>
                    <p className="text-sm">Start mining to see live updates</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">Projected Earnings</h3>
                <p className="text-slate-500 text-sm">Based on current network difficulty</p>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">${selectedPlan.dailyEarnings.toFixed(2)}</div>
                  <div className="text-xs text-slate-500">Daily</div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-600" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">${(selectedPlan.dailyEarnings * 30).toFixed(2)}</div>
                  <div className="text-xs text-slate-500">Monthly</div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-600" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">${(selectedPlan.dailyEarnings * 365).toFixed(2)}</div>
                  <div className="text-xs text-slate-500">Yearly</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pool Workers */}
        <div className="mt-6">
          <WorkerPool />
        </div>
      </div>
    </section>
  );
}