'use client';

import Link from 'next/link';
import { ArrowLeft, BotMessageSquare } from 'lucide-react';

export default function TermsOfServicePage() {
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
            <span className="text-sm font-bold tracking-tight">PropBot AI</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-8">Last Updated: July 26, 2026</p>

        {/* Content */}
        <div className="space-y-6 text-slate-300 leading-relaxed text-sm">
          <p>
            Welcome to PropBot AI. These Terms of Service ("Terms") govern your access to and use of the services, websites, and software applications provided by <strong>Techwave Ventures Private Limited</strong> ("we," "us," or "our").
          </p>
          <p>
            By accessing or using our services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our services.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Account Terms and Use of Service</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>You must be at least 18 years old to use this service.</li>
            <li>You must provide accurate and complete registration details.</li>
            <li>You are responsible for maintaining the security of your account and credentials.</li>
            <li>You may not use our services for any unauthorized or illegal purpose.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Subscription and Credits</h2>
          <p>
            Our service offers a Standard monthly subscription and pre-paid credit refills processed securely through Cashfree. 
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Standard plan credits are refreshed monthly and do not roll over to the next cycle.</li>
            <li>Usage quotas for WhatsApp automated messages and Gemini LLM replies are calculated based on your current plan and balance.</li>
            <li>You agree to pay all charges associated with your account at the rates in effect when the charges are incurred.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Intellectual Property Rights</h2>
          <p>
            All code, UI designs, algorithms, logos, and materials present in the PropBot AI platform are the intellectual property of Techwave Ventures Private Limited. You are granted a limited, non-exclusive, non-transferable, and revocable license to access our platform solely for your business operations.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">4. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, Techwave Ventures Private Limited shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of the platform.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">5. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles. Any legal action or proceeding arising under these Terms will be subject to the exclusive jurisdiction of courts located in India.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">6. Contact Information</h2>
          <p>
            For any legal or service inquiries regarding these Terms, please reach out to us at:
          </p>
          <p className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-slate-300">
            <strong>Techwave Ventures Private Limited</strong><br />
            Email: <a href="mailto:legal@techwaveventures.in" className="text-blue-400 hover:underline">legal@techwaveventures.in</a><br />
            Website: <a href="https://techwaveventures.in" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">techwaveventures.in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
