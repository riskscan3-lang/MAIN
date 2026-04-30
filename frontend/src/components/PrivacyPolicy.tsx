// @ts-nocheck
export function PrivacyPolicy() {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Privacy{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              Policy
            </span>
          </h1>
          <p className="text-slate-400">Last updated: January 2024</p>
        </div>

        <div className="prose prose-invert prose-orange max-w-none">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
              <p className="text-slate-400 mb-4">
                XMRMine Pro collects information you provide directly to us, including:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>Account information (email, username, password)</li>
                <li>Identity verification documents (for KYC compliance)</li>
                <li>Transaction history and wallet addresses</li>
                <li>Communications with our support team</li>
                <li>Device and browser information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
              <p className="text-slate-400 mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>Provide, maintain, and improve our mining services</li>
                <li>Process transactions and send related notifications</li>
                <li>Send promotional communications (with your consent)</li>
                <li>Detect and prevent fraud and abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Information Sharing</h2>
              <p className="text-slate-400 mb-4">
                We do not sell your personal information. We may share your information with:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>Service providers who assist our operations</li>
                <li>Law enforcement when required by law</li>
                <li>Business partners with your consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Data Security</h2>
              <p className="text-slate-400">
                We implement industry-standard security measures including encryption, 
                secure servers, and regular security audits. However, no method of 
                transmission over the Internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Your Rights</h2>
              <p className="text-slate-400 mb-4">You have the right to:</p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>Access and download your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Cookies</h2>
              <p className="text-slate-400">
                We use cookies and similar technologies to improve your experience, 
                analyze usage, and personalize content. You can manage cookie preferences 
                in your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Contact Us</h2>
              <p className="text-slate-400">
                For privacy-related inquiries, contact us at privacy@xmrminepro.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}