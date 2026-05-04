// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import {
  Gift, Users, Trophy, Plane, Pickaxe, Crown, Infinity as InfinityIcon,
  Copy, Check, Twitter, Send as SendIcon, Wallet, Loader2, Lock, Sparkles,
  CheckCircle2, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { useWallet, shortAddress } from "../context/WalletContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PLAN_META = {
  "1": { name: "Pool Plan",  hashrateHs: 2500   },
  "2": { name: "Solo Miner", hashrateHs: 25000  },
  "3": { name: "Dual Miner", hashrateHs: 60000  },
  "4": { name: "Multi Rig",  hashrateHs: 150000 },
};
const SOLO_RIG_USD = 2500;
const NETWORK_3_2_2_GOAL_USD = 25000;
const PASSIVE_INFINITY_GOAL_RIGS = 200;
const GRAND_MASTER_GOAL_RIGS = 500;

const fmtUSD = (n) => `$${Math.round(n).toLocaleString()}`;

interface RewardsProps {
  setActiveView?: (view: string) => void;
}

export function Rewards({ setActiveView }: RewardsProps) {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [referralsData, setReferralsData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch user's purchases (to determine eligibility) + referrals data
  useEffect(() => {
    if (!wallet.isConnected) {
      setHasActivePlan(false);
      setReferralsData(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [purchRes, refRes] = await Promise.all([
          fetch(`${API}/purchases?buyer_address=${wallet.address}`),
          fetch(`${API}/wallet/${wallet.address}/referrals`),
        ]);
        if (!cancelled && purchRes.ok) {
          const purchases = await purchRes.json();
          setHasActivePlan(Array.isArray(purchases) && purchases.length > 0);
        }
        if (!cancelled && refRes.ok) {
          setReferralsData(await refRes.json());
        }
      } catch (_) {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [wallet.isConnected, wallet.address]);

  const referralLink = useMemo(() => {
    if (!wallet.address || typeof window === "undefined") return "";
    return `${window.location.origin}/?ref=${wallet.address}`;
  }, [wallet.address]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) {}
  };

  const directCount = referralsData?.direct_count ?? 0;
  const directSolo = referralsData?.direct_solo_rigs ?? 0;
  const networkValue = referralsData?.network_value_usd ?? 0;
  const networkSoloRigs = referralsData?.network_solo_rigs_total ?? 0;
  const legs = referralsData?.legs ?? [[], [], []];
  const legCounts = legs.map((l) => l?.length ?? 0);

  // Tier 1: 1 Direct Referral $250 USDT
  const tier1Pct = Math.min(100, (directSolo >= 1 ? 1 : 0) * 100);
  // Tier 2: 3 Direct Referrals → $500 + Tour
  const tier2Pct = Math.min(100, (directSolo / 3) * 100);
  // Tier 3: 3-2-2 Network Bonus — $25,000 network value + 3-2-2 leg structure
  const networkPct = Math.min(100, (networkValue / NETWORK_3_2_2_GOAL_USD) * 100);
  const legA = legCounts[0] || 0;
  const legB = legCounts[1] || 0;
  const legC = legCounts[2] || 0;
  const has322 = legA >= 3 && legB >= 2 && legC >= 2;
  const tier3Pct = has322 && networkValue >= NETWORK_3_2_2_GOAL_USD ? 100 : Math.max(networkPct, ((legA + legB + legC) / 7) * 100);
  // Tier 4: Passive Infinity (200 rigs)
  const passivePct = Math.min(100, (networkSoloRigs / PASSIVE_INFINITY_GOAL_RIGS) * 100);
  // Tier 5: Grand Master (500 rigs)
  const grandPct = Math.min(100, (networkSoloRigs / GRAND_MASTER_GOAL_RIGS) * 100);

  /* ----------------------------- GATES ----------------------------- */

  if (!wallet.isConnected) {
    return (
      <Gate
        icon={<Wallet className="w-10 h-10 text-white" />}
        title="Rewards Program"
        body="Connect your wallet to unlock your unique referral link and start earning $250 instant cash, free rigs, and milestone bonuses by sharing MONERO RIG."
      >
        <ConnectWalletButton />
      </Gate>
    );
  }

  if (loading) {
    return (
      <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading your rewards…
        </div>
      </section>
    );
  }

  if (!hasActivePlan) {
    return (
      <Gate
        icon={<Lock className="w-10 h-10 text-white" />}
        title="Activate a Plan to Join"
        body="The MONERO RIG Rewards program is exclusive to plan holders. Buy any active plan and your unique referral link unlocks instantly — earn from every direct referral and your full team network."
      >
        <Button
          onClick={() => setActiveView && setActiveView("home")}
          data-testid="rewards-go-buy-plan"
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-6 py-5 font-semibold"
        >
          <Pickaxe className="w-4 h-4 mr-2" /> Browse Plans
        </Button>
      </Gate>
    );
  }

  /* ----------------------------- PAGE ------------------------------ */

  return (
    <section className="pt-24 pb-24 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden" data-testid="rewards-page">
      {/* Background ambience */}
      <div className="absolute -top-20 left-1/3 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto relative space-y-12">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-2 mb-5">
            <Gift className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-300">Affiliate &amp; Leadership Program</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-3">
            Earn rewards by{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              growing the network
            </span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Share your unique referral link. Earn instant cash, free rigs, and milestone bonuses up to $125,000 USDT.
          </p>
        </div>

        {/* Referral Link card */}
        <Card className="border-orange-500/40 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent backdrop-blur-sm shadow-2xl shadow-orange-500/10" data-testid="referral-link-card">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Your Referral Link</h3>
                  <p className="text-xs text-slate-400">Anyone who buys a plan via this link is permanently your direct.</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">For wallet</div>
                <div className="font-mono text-sm text-orange-300">{shortAddress(wallet.address)}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3">
                <code className="flex-1 text-xs sm:text-sm font-mono text-white truncate" data-testid="referral-link">
                  {referralLink}
                </code>
                <button
                  onClick={copyLink}
                  data-testid="copy-referral-link"
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-all"
                  title="Copy"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <a
                data-testid="share-twitter-rewards"
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Earning passive Monero with MONERO RIG ⛏️ — join with my link for a 5% bonus → ${referralLink}`)}`}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0d1426] border border-slate-800 hover:border-sky-500/50 text-slate-200 text-sm font-medium transition-all min-w-[140px]"
              >
                <Twitter className="w-4 h-4 text-sky-400" /> Share on X
              </a>
              <a
                data-testid="share-telegram-rewards"
                href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Earning passive Monero with MONERO RIG — join with my link for a 5% bonus")}`}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#102132] border border-slate-800 hover:border-cyan-500/50 text-slate-200 text-sm font-medium transition-all min-w-[140px]"
              >
                <SendIcon className="w-4 h-4 text-cyan-400" /> Share on Telegram
              </a>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-orange-500/15">
              <Stat label="Direct Referrals" value={directCount} dotColor="bg-orange-400" testId="stat-direct" />
              <Stat label="Solo Rigs Referred" value={directSolo} dotColor="bg-amber-400" testId="stat-solo" />
              <Stat label="Network Value" value={fmtUSD(networkValue)} dotColor="bg-green-400" testId="stat-network" />
              <Stat label="Solo Rigs in Network" value={networkSoloRigs} dotColor="bg-blue-400" testId="stat-network-rigs" />
            </div>
          </CardContent>
        </Card>

        {/* ===== Affiliate & Networking Rewards ===== */}
        <Section
          stripe="bg-gradient-to-r from-orange-500 to-amber-500"
          title="Affiliate & Networking Rewards"
          subtitle="Direct payouts that hit instantly when your referrals activate."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <RewardCard
              data-testid="tier-1-direct"
              tag="INSTANT"
              tagColor="bg-gradient-to-r from-orange-500 to-amber-500"
              title="1 Direct Referral"
              big={<><span className="text-orange-400">$250</span> USDT</>}
              description={<>Refer one <strong className="text-orange-300">$2,500 Solo Rig</strong> and get an instant reward. Balance is redeemable towards your next $2,500 Rig purchase.</>}
              progressPct={tier1Pct}
              progressLabel={`${directSolo}/1 Solo Rig referred`}
              icon={<Gift className="w-5 h-5" />}
              completed={directSolo >= 1}
            />
            <RewardCard
              data-testid="tier-2-direct"
              tag="TRAVEL"
              tagColor="bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900"
              title="3 Direct Referrals"
              big={<><span className="text-orange-400">$500</span> + Tour</>}
              description={<><strong className="text-orange-300">$500</strong> Cash Reward plus an exclusive <strong className="text-amber-300">Russia Mining Setup Tour</strong> to see our infrastructure in person.</>}
              progressPct={tier2Pct}
              progressLabel={`${directSolo}/3 Solo Rigs referred`}
              icon={<Plane className="w-5 h-5" />}
              completed={directSolo >= 3}
            />
          </div>
        </Section>

        {/* ===== Leadership & Team Rewards ===== */}
        <Section
          stripe="bg-gradient-to-r from-orange-500 to-amber-500"
          title="Leadership & Team Rewards"
          subtitle="Build a balanced team to unlock our flagship 3-2-2 free hardware bonus."
        >
          <Card
            className="relative overflow-hidden border-orange-500/40 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-transparent"
            data-testid="tier-322"
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
            <CardContent className="p-6 sm:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="lg:col-span-2">
                  <h3 className="text-2xl font-bold text-orange-400 mb-1">The 3-2-2 Network Bonus</h3>
                  <p className="text-slate-300 mb-4">
                    Achieve a total network business of <strong className="text-orange-300">$25,000</strong> to unlock a free hardware asset.
                  </p>
                  <ul className="space-y-1.5 text-sm text-slate-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${directSolo >= 3 ? "text-green-400" : "text-slate-600"}`} />
                      <span className={directSolo >= 3 ? "text-green-400" : ""}>3 Direct $2,500 Rigs <span className="text-slate-500">({directSolo}/3)</span></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${has322 ? "text-green-400" : "text-slate-600"}`} />
                      <span className={has322 ? "text-green-400" : ""}>7 Network Members in 3 Legs (Structure: 3-2-2)</span>
                    </li>
                  </ul>

                  <div className="grid grid-cols-3 gap-3 mt-5">
                    <LegBox testId="leg-a" label="LEG A" count={legA} target={3} />
                    <LegBox testId="leg-b" label="LEG B" count={legB} target={2} active />
                    <LegBox testId="leg-c" label="LEG C" count={legC} target={2} />
                  </div>

                  <div className="mt-5">
                    <ProgressBar pct={tier3Pct} from="from-orange-500" to="to-amber-500" />
                    <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
                      <span>Network value: <span className="text-orange-300 font-semibold">{fmtUSD(networkValue)}</span> / {fmtUSD(NETWORK_3_2_2_GOAL_USD)}</span>
                      <span className="text-orange-400 font-semibold">{tier3Pct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* FREE RIG callout */}
                <div className="text-center bg-slate-950/60 border border-orange-500/30 rounded-2xl p-6 relative overflow-hidden">
                  <Pickaxe className="w-10 h-10 text-orange-400 mx-auto mb-2" />
                  <div className="text-3xl font-extrabold text-white leading-tight">FREE</div>
                  <div className="text-3xl font-extrabold text-white leading-tight">RIG</div>
                  <div className="text-xs uppercase tracking-wider text-orange-400 font-semibold mt-2">Worth $2,500</div>
                  {has322 && networkValue >= NETWORK_3_2_2_GOAL_USD && (
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Unlocked
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* ===== Mega Leadership Milestones ===== */}
        <Section
          stripe="bg-gradient-to-r from-orange-500 to-amber-500"
          title="Mega Leadership Milestones"
          subtitle="Pinnacle rewards for top builders in the MONERO RIG network."
        >
          <div className="space-y-5">
            <Card className="border-orange-500/30 bg-gradient-to-br from-slate-900/80 to-slate-950" data-testid="tier-passive-infinity">
              <CardContent className="p-6 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="md:col-span-2">
                    <div className="text-[10px] uppercase tracking-wider text-orange-400 mb-1 font-semibold">
                      Network Volume: 200 Solo Rigs
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                      Passive <span className="text-orange-400">Infinity</span> Reward
                    </h3>
                    <p className="text-slate-400 mt-2">
                      Scale your network to <strong className="text-orange-300">200 units</strong> ($2,500 ea.) and unlock the ultimate passive engine.
                    </p>
                    <div className="mt-5 space-y-3">
                      <ProgressBar pct={passivePct} from="from-orange-500" to="to-amber-500" />
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{networkSoloRigs} / {PASSIVE_INFINITY_GOAL_RIGS} Solo Rigs in network</span>
                        <span className="text-orange-400 font-semibold">{passivePct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center bg-slate-950 border border-orange-500/30 rounded-2xl p-5">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Pickaxe className="w-7 h-7 text-orange-400" />
                      <InfinityIcon className="w-7 h-7 text-amber-400" />
                    </div>
                    <div className="text-xl font-extrabold text-white">1 FREE RIG</div>
                    <div className="text-[10px] uppercase tracking-wider text-orange-400 font-semibold mt-1">Every Single Day</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent" data-testid="tier-grand-master">
              <CardContent className="p-6 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="md:col-span-2">
                    <div className="text-[10px] uppercase tracking-wider text-green-400 mb-1 font-semibold">
                      Elite Volume: 500 Solo Rigs
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                      Grand <span className="text-green-400">Master</span> Bonus
                    </h3>
                    <p className="text-slate-400 mt-2">
                      The pinnacle of leadership performance within the Monero Rig ecosystem.
                    </p>
                    <div className="mt-5 space-y-3">
                      <ProgressBar pct={grandPct} from="from-green-500" to="to-emerald-400" />
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{networkSoloRigs} / {GRAND_MASTER_GOAL_RIGS} Solo Rigs in network</span>
                        <span className="text-green-400 font-semibold">{grandPct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center bg-slate-950 border border-green-500/30 rounded-2xl p-5">
                    <Crown className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <div className="text-3xl font-extrabold text-green-400">$125,000</div>
                    <div className="text-[10px] uppercase tracking-wider text-green-400 font-semibold mt-1">USDT Cash Reward</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* CTA footer */}
        <div className="text-center pt-4">
          <p className="text-slate-400 mb-4">Ready to grow your network?</p>
          <Button
            onClick={copyLink}
            data-testid="copy-referral-link-bottom"
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-6 py-5 font-semibold"
          >
            {copied ? <><Check className="w-4 h-4 mr-2" /> Copied</> : <><Copy className="w-4 h-4 mr-2" /> Copy My Referral Link</>}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ============================== Helpers ============================== */

function Gate({ icon, title, body, children }) {
  return (
    <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30 mb-6">
          {icon}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">{body}</p>
        <div className="flex justify-center" data-testid="rewards-gate-cta">
          {children}
        </div>
      </div>
    </section>
  );
}

function Section({ stripe, title, subtitle, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-1 h-8 rounded-full ${stripe}`} />
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function RewardCard({ tag, tagColor, title, big, description, progressPct, progressLabel, icon, completed, ...rest }) {
  return (
    <Card className={`relative overflow-hidden bg-slate-900/70 ${completed ? "border-green-500/40 shadow-lg shadow-green-500/10" : "border-orange-500/25"}`} {...rest}>
      <div className="absolute -right-12 -top-12 w-32 h-32 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between mb-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{title}</div>
          <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full text-white ${tagColor}`}>
            {tag}
          </span>
        </div>
        <div className="text-3xl font-extrabold text-white mb-2">{big}</div>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>

        <div className="mt-5">
          <ProgressBar pct={progressPct} from="from-orange-500" to="to-amber-500" />
          <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
            <span>{progressLabel}</span>
            <span className={`font-semibold ${completed ? "text-green-400" : "text-orange-400"}`}>
              {completed ? "Unlocked" : `${progressPct.toFixed(0)}%`}
            </span>
          </div>
        </div>

        {completed && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
            <CheckCircle2 className="w-3 h-3" /> Reward unlocked
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LegBox({ testId, label, count, target, active }) {
  const filled = count >= target;
  return (
    <div
      data-testid={testId}
      className={`text-center rounded-xl border-2 px-3 py-3 ${
        filled
          ? "border-green-500 bg-green-500/10"
          : active
          ? "border-orange-500 bg-orange-500/10"
          : "border-slate-800 bg-slate-950/60"
      }`}
    >
      <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${filled ? "text-green-400" : "text-slate-400"}`}>{label}</div>
      <div className={`text-xl font-extrabold ${filled ? "text-green-400" : "text-white"}`}>{count}</div>
      <div className="text-[9px] uppercase tracking-wider text-slate-500">Members · Target {target}</div>
    </div>
  );
}

function ProgressBar({ pct, from, to }) {
  return (
    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${from} ${to} transition-[width] duration-500`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function Stat({ label, value, dotColor, testId }) {
  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-3" data-testid={testId}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
      </div>
      <div className="text-xl font-bold text-white tabular-nums">{value}</div>
    </div>
  );
}
