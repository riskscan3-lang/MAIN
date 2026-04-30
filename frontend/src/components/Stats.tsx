// @ts-nocheck
import { Card, CardContent } from "./ui/card";
import { Users, TrendingUp, Clock, Wallet } from "lucide-react";

const stats = [
  { icon: Users, value: "12,500+", label: "Active Miners", color: "text-blue-400" },
  { icon: TrendingUp, value: "$18.5M+", label: "USDT Paid Out", color: "text-orange-400" },
  { icon: Clock, value: "99.9%", label: "Uptime Guarantee", color: "text-green-400" },
  { icon: Wallet, value: "847,000", label: "XMR Mined Total", color: "text-amber-400" }
];

export function Stats() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Trusted by Thousands</h2>
          <p className="text-slate-400">Join our growing community of successful miners</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, idx) => (
            <Card key={idx} className="bg-slate-900 border-slate-800 hover:border-orange-500/50 transition-colors">
              <CardContent className="pt-6 text-center">
                <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
                <div className="text-2xl sm:text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "Alex M.", role: "Professional Miner", text: "Started with $2,499 plan, already earned over $300 in my first month. Great ROI!" },
            { name: "Sarah K.", role: "Crypto Investor", text: "The Professional plan gives consistent daily earnings. Support team is very responsive." },
            { name: "James T.", role: "Tech Enthusiast", text: "Upgraded to Enterprise. The dedicated pool makes a huge difference in earnings." }
          ].map((testimonial, idx) => (
            <Card key={idx} className="bg-slate-900 border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-slate-300 mb-4">"{testimonial.text}"</p>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-slate-500">{testimonial.role}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}