// @ts-nocheck
import { Card, CardContent } from "./ui/card";
import { Shield, Users, Globe, Award, Target, Heart, Lightbulb, Rocket } from "lucide-react";

export function AboutUs() {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-2 mb-6">
            <Globe className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-300">Est. 2019 • 5 Years of Excellence</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            About{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              XMRMine Pro
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            We're on a mission to make cryptocurrency mining accessible to everyone, 
            removing the barriers of expensive hardware and technical complexity.
          </p>
        </div>

        {/* Story */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <div className="space-y-4 text-slate-400">
              <p>
                Founded in 2019, XMRMine Pro began with a simple vision: democratize access to cryptocurrency mining. 
                Our founders, experienced blockchain developers and mining enthusiasts, recognized that the barriers 
                to entry were too high for most people.
              </p>
              <p>
                We built state-of-the-art mining facilities across multiple locations, powered by renewable energy 
                sources. Our proprietary cooling systems and optimized mining algorithms ensure maximum efficiency 
                and returns for our users.
              </p>
              <p>
                Today, we're proud to serve over 12,500 active miners worldwide, having paid out more than $18.5M 
                in USDT earnings. Our commitment to transparency, security, and customer success remains unwavering.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-orange-400 mb-2">2019</div>
                <div className="text-sm text-slate-500">Founded</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">50+</div>
                <div className="text-sm text-slate-500">Team Members</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-green-400 mb-2">12.5K+</div>
                <div className="text-sm text-slate-500">Active Miners</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-amber-400 mb-2">$18.5M</div>
                <div className="text-sm text-slate-500">Paid Out</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: "Security", desc: "Multi-signature wallets and cold storage protect your investments." },
              { icon: Target, title: "Transparency", desc: "Real-time dashboard shows exactly what your hardware is mining." },
              { icon: Heart, title: "Customer First", desc: "24/7 support team dedicated to your mining success." },
              { icon: Lightbulb, title: "Innovation", desc: "Continuously optimizing algorithms for maximum efficiency." }
            ].map((value, idx) => (
              <Card key={idx} className="bg-slate-900 border-slate-800 hover:border-orange-500/50 transition-colors">
                <CardContent className="pt-6 text-center">
                  <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-7 h-7 text-orange-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                  <p className="text-slate-500 text-sm">{value.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-4">Leadership Team</h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Meet the experts driving innovation in cryptocurrency mining
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Michael Chen", role: "CEO & Founder", exp: "15+ years in blockchain" },
              { name: "Sarah Williams", role: "CTO", exp: "Ex-Google Engineer" },
              { name: "David Kumar", role: "Head of Operations", exp: "Mining since 2013" },
              { name: "Emma Johnson", role: "Head of Security", exp: "Ex-Coinbase Security" }
            ].map((member, idx) => (
              <Card key={idx} className="bg-slate-900 border-slate-800 text-center group hover:border-orange-500/50 transition-all">
                <CardContent className="pt-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white group-hover:scale-110 transition-transform">
                    {member.name.charAt(0)}
                  </div>
                  <h3 className="text-lg font-semibold">{member.name}</h3>
                  <p className="text-orange-400 text-sm mb-1">{member.role}</p>
                  <p className="text-slate-500 text-xs">{member.exp}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Facilities */}
        <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 border border-orange-500/30 rounded-3xl p-8 sm:p-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">World-Class Mining Facilities</h2>
              <p className="text-slate-400 mb-6">
                Our mining farms are strategically located across North America and Europe, 
                powered by renewable energy sources to minimize environmental impact while 
                maximizing your returns.
              </p>
              <ul className="space-y-3">
                {[
                  "3 data centers across 2 continents",
                  "100% renewable energy powered",
                  "Advanced liquid cooling systems",
                  "24/7 on-site security & maintenance",
                  "99.9% uptime guarantee"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/80 rounded-xl p-6 text-center">
                <Rocket className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">2.4 GH/s</div>
                <div className="text-sm text-slate-500">Total Hashrate</div>
              </div>
              <div className="bg-slate-900/80 rounded-xl p-6 text-center">
                <Globe className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">3</div>
                <div className="text-sm text-slate-500">Data Centers</div>
              </div>
              <div className="bg-slate-900/80 rounded-xl p-6 text-center">
                <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">100%</div>
                <div className="text-sm text-slate-500">Green Energy</div>
              </div>
              <div className="bg-slate-900/80 rounded-xl p-6 text-center">
                <Users className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">50+</div>
                <div className="text-sm text-slate-500">Expert Staff</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}