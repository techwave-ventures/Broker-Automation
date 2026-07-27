'use client';

import Link from 'next/link';
import { ArrowLeft, BotMessageSquare } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header navigation */}
        <div className="flex justify-between items-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <BotMessageSquare className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">Roofiyo AI</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Last Updated: July 26, 2026</p>

        {/* Content */}
        <div className="space-y-6 text-slate-300 leading-relaxed text-sm">
          <p>
            At Roofiyo, operated by <strong>Techwave Ventures Private Limited</strong> ("we," "us," or "our"), your privacy is of paramount importance to us. This Privacy Policy describes how we collect, use, and share your personal information when you use our services, including our web applications, WhatsApp Business API integrations, and other platform features.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Information We Collect</h2>
          <p>
            We collect information that you provide to us directly, such as when you create an account, configure your agent settings, upload property listings, or communicate with our support team. This information may include:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Name, email address, and phone number.</li>
            <li>Business name, industry type, and lead generation goals.</li>
            <li>WhatsApp Business phone number IDs and Access Tokens.</li>
            <li>Information related to property listings and client chats.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">2. How We Use Your Information</h2>
          <p>
            We use the information we collect to operate, maintain, and improve our services, including:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Providing automated real estate lead generation, WhatsApp replies, and booking viewings.</li>
            <li>Processing payments and tracking credits via Cashfree.</li>
            <li>Personalizing your experience and sending service notifications.</li>
            <li>Ensuring security, debugging system issues, and preventing abuse.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Sharing and Disclosing Information</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted third-party service providers (such as payment gateways like Cashfree, and cloud hosting services) only to the extent necessary to perform services on our behalf and subject to confidentiality agreements.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">4. Data Security and Retention</h2>
          <p>
            We implement robust security measures to protect your personal and business data. Your information is stored securely in databases hosted on secure cloud infrastructure. We retain your information as long as necessary to provide the services or as required to comply with our legal obligations.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">5. Contact Us</h2>
          <p>
            If you have any questions or concerns regarding this Privacy Policy or our data handling practices, please contact us at:
          </p>
          <p className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-slate-300">
            <strong>Techwave Ventures Private Limited</strong><br />
            Email: <a href="mailto:privacy@techwaveventures.in" className="text-blue-400 hover:underline">privacy@techwaveventures.in</a><br />
            Website: <a href="https://techwaveventures.in" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">techwaveventures.in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
