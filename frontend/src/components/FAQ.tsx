// @ts-nocheck
import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { ChevronDown, HelpCircle, MessageCircle } from "lucide-react";

const faqCategories = [
  {
    category: "GettingStarted",
    title: "GettingStarted",
    questions: [
      {
        q: "How do I start mining with XMRMine Pro?A:",
        a: "GettingStarted is simple: Choose a plan that fits your budget, deposit USDT to your account, and we'll automatically allocate mining resources to your account. You'll start seeing earnings within minutes of your deposit being confirmed."
      },
      {
        q: "What cryptocurrencies do you accept for deposit?A:",
        a: "We currently accept USDT (Tether) for all plan purchases. USDT provides stability and eliminates volatility concerns during the deposit process. We accept USDT on multiple chains including ERC-20, TRC-20, and BEP-20."
      },
      {
        q: "How long does it take to activate my mining plan?A:",
        a: "Your mining plan activates immediately after your deposit receives 12 confirmations on the blockchain. This typically takes 5-15 minutes depending on network congestion. You'll receive an email notification once your plan is active."
      }
    ]
  },
  {
    category: "Earnings & Payouts",
    questions: [
      {
        q: "How are mining earnings calculated?A:",
        a: "Earnings are calculated based on your allocated hashrate and the current XMR network difficulty. We use a transparent PPS (Pay Per Share) model where you earn for every valid share submitted by your allocated mining power, regardless of whether the pool finds a block."
      },
      {
        q: "When can I withdraw my earnings?A:",
        a: "You can withdraw your earnings at any time once your balance exceeds $10 USDT. Professional and Enterprise plan holders enjoy instant withdrawals, while Starter plan holders receive payouts within 24 hours."
      },
      {
        q: "Is there a minimum withdrawal amount?A:",
        a: "Yes, the minimum withdrawal is $10 USDT. This helps keep transaction fees reasonable relative to your withdrawal amount. There's no maximum withdrawal limit."
      },
      {
        q: "What fees do you charge?A:",
        a: "We charge a small pool fee of 1.5% which is already factored into the displayed earnings. There are no hidden fees. Withdrawal fees are minimal (typically $1-2 USDT) and are clearly shown before you confirm your withdrawal."
      }
    ]
  },
  {
    category: "Plans & Contracts",
    questions: [
      {
        q: "What happens when my contract expires?A:",
        a: "When your contract period ends (30, 60, or 90 days depending on your plan), you have two options: renew your contract at current rates, or withdraw all your earnings. We'll notify you 7 days before expiration so you can make your decision."
      },
      {
        q: "Can I upgrade my plan?A:",
        a: "Yes! You can upgrade at any time by paying the difference between your current plan and the new plan. Your hashrate will increase immediately, and your contract duration will reset based on the new plan."
      },
      {
        q: "Is there a money-back guarantee?A:",
        a: "Yes, we offer a 30-day money-back guarantee on all plans. If you're not satisfied with our service within the first 30 days, contact support for a full refund of your initial deposit (minus any earnings already withdrawn)."
      }
    ]
  },
  {
    category: "Technical",
    questions: [
      {
        q: "Do I need any special hardware or software?A:",
        a: "No! That's the beauty of cloud mining. We handle all the hardware, electricity, cooling, and maintenance. You just need a device with internet access to monitor your earnings through our dashboard."
      },
      {
        q: "How do I track my mining progress?A:",
        a: "Our real-time dashboard shows your current hashrate, blocks found, earnings, and more. You can also view detailed statistics including daily/weekly/monthly earnings, pool statistics, and network difficulty trends."
      },
      {
        q: "What happens if the mining pool goes down?A:",
        a: "We have redundant systems across multiple data centers. If one pool experiences issues, your hashrate is automatically redirected to another. Our 99.9% uptime guarantee ensures minimal disruption to your earnings."
      }
    ]
  },
  {
    category: "Security",
    questions: [
      {
        q: "How secure is my investment?A:",
        a: "We take security extremely seriously. All funds are stored in cold wallets with multi-signature protection. Our platform uses industry-standard encryption, 2FA authentication, and regular security audits by third-party firms."
      },
      {
        q: "Do you offer two-factor authentication?A:",
        a: "Yes, we strongly recommend enabling 2FA on your account. We support both authenticator apps (Google Authenticator, Authy) and hardware keys (YubiKey). 2FA is required for withdrawals and account changes."
      },
      {
        q: "Are you regulated?A:",
        a: "We operate in compliance with applicable regulations in our jurisdictions. We maintain proper KYC/AML procedures for larger accounts and work with regulated payment processors for USDT transactions."
      }
    ]
  }
];

export function FAQ() {
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const categories = ["All", ...faqCategories.map(c => c.category)];

  const filteredFAQs = activeCategory === "All" 
    ? faqCategories 
    : faqCategories.filter(c => c.category === activeCategory);

  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-2 mb-6">
            <HelpCircle className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-300">Got Questions? We've Got Answers</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              Questions
            </span>
          </h1>
          <p className="text-slate-400 text-lg">
            Everything you need to know about XMRMine Pro and cloud mining
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-orange-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQs.map((category, catIdx) => (
            <div key={catIdx}>
              {activeCategory === "All" && (
                <h2 className="text-xl font-semibold mb-4 text-orange-400">{category.title}</h2>
              )}
              {category.questions.map((item, idx) => {
                const itemId = `${catIdx}-${idx}`;
                const isOpen = openItems.includes(itemId);
                
                return (
                  <Card 
                    key={itemId}
                    className="bg-slate-900 border-slate-800 mb-3 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleItem(itemId)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
                    >
                      <span className="font-medium pr-4">{item.q}</span>
                      <ChevronDown className={`w-5 h-5 text-orange-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-4 text-slate-400 border-t border-slate-800 pt-4">
                        {item.a}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 border border-orange-500/30">
            <CardContent className="pt-8 pb-8">
              <MessageCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Still Have Questions?</h3>
              <p className="text-slate-400 mb-6">
                Our support team is available 24/7 to help you with any questions
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-8 py-3 rounded-xl transition-all">
                  Contact Support
                </button>
                <button className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-8 py-3 rounded-xl border border-slate-700 transition-all">
                  Live Chat
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}