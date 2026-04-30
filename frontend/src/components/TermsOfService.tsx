// @ts-nocheck
export function TermsOfService() {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Terms of{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              Service
            </span>
          </h1>
          <p className="text-slate-400">Last updated: January 2024</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-400">
              By accessing or using XMRMine Pro services, you agree to be bound by these 
              Terms of Service and all applicable laws and regulations. If you do not agree 
              with any of these terms, you are prohibited from using this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Service Description</h2>
            <p className="text-slate-400 mb-4">
              XMRMine Pro provides cloud-based cryptocurrency mining services. Our services include:
            </p>
            <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
              <li>Mining plan subscriptions with specified hashrates</li>
              <li>Real-time mining dashboard and statistics</li>
              <li>Earnings distribution and withdrawal services</li>
              <li>Customer support and technical assistance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Account Responsibilities</h2>
            <p className="text-slate-400 mb-4">You are responsible for:</p>
            <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Ensuring your use complies with applicable laws</li>
              <li> Providing accurate and complete registration information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Payment Terms</h2>
            <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
              <li>All payments are made in USDT (Tether)</li>
              <li>Plans are activated after 12 blockchain confirmations</li>
              <li>Earnings are calculated based on actual mining performance</li>
              <li>Withdrawal minimum is $10 USDT</li>
              <li>We reserve the right to adjust fees with 30 days notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Refund Policy</h2>
            <p className="text-slate-400">
              We offer a 30-day money-back guarantee on all plans. Refund requests must be 
              submitted within 30 days of purchase. Refunds exclude any earnings already 
              withdrawn. Processing time is 5-7 business days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Prohibited Activities</h2>
            <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
              <li>Using the service for illegal purposes</li>
              <li>Attempting to manipulate earnings or exploit vulnerabilities</li>
              <li>Sharing account credentials with third parties</li>
              <li>Using automated systems without authorization</li>
              <li>Engaging in money laundering or fraudulent activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Limitation of Liability</h2>
            <p className="text-slate-400">
              XMRMine Pro shall not be liable for any indirect, incidental, special, 
              consequential, or punitive damages resulting from your use of our services. 
              Cryptocurrency mining involves inherent risks, and past performance does not 
              guarantee future results.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Termination</h2>
            <p className="text-slate-400">
              We reserve the right to terminate or suspend your account at any time for 
              violations of these terms. Upon termination, you may withdraw any remaining 
              balance within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Governing Law</h2>
            <p className="text-slate-400">
              These terms shall be governed by the laws of the jurisdiction in which 
              XMRMine Pro operates, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Contact</h2>
            <p className="text-slate-400">
              For questions about these terms, contact us at legal@xmrminepro.com
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}