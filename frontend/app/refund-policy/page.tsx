'use client';

import Link from 'next/link';
import { ArrowLeft, BotMessageSquare } from 'lucide-react';

export default function RefundPolicyPage() {
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
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Return & Refund Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Last Updated: July 26, 2026</p>

        {/* Content */}
        <div className="space-y-6 text-slate-300 leading-relaxed text-sm">
          <p>
            Thank you for choosing Roofiyo, operated by <strong>Techwave Ventures Private Limited</strong> ("we," "us," or "our").
          </p>
          <p>
            Please read this policy carefully. This is the Return and Refund Policy of Roofiyo.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Digital Products and Services</h2>
          <p>
            Because Roofiyo is a digital Software-as-a-Service (SaaS) platform, all transactions for monthly subscriptions and pre-paid credit refills are finalized upon successful charge.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>We do not issue refunds for standard monthly subscriptions once the billing cycle has started or credits have been granted.</li>
            <li>We do not issue refunds for pre-paid credit top-ups after the credits have been added to your account balance.</li>
            <li>Credits are non-transferable and have no cash value.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Exceptions</h2>
          <p>
            We understand that exceptional circumstances can take place. We may review refund requests on a case-by-case basis under the following conditions:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Non-delivery of Service:</strong> If you made a payment but the system failed to deliver the purchased credits or activate your subscription due to a technical error on our side.</li>
            <li><strong>Billing Errors:</strong> If you were charged multiple times for the same transaction.</li>
          </ul>
          <p>
            If a refund is approved by our support team, it will be processed and credited back to your original payment source via Cashfree within 5 to 7 working days.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Cancellation</h2>
          <p>
            You can cancel your subscription at any time directly through your dashboard profile settings. Upon cancellation, your subscription will remain active until the end of the current billing cycle, and no further automated recurring charges will be initiated.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">4. Contact Support</h2>
          <p>
            If you have any questions about our Return and Refund Policy, or if you believe there was a billing error on your account, please contact us at:
          </p>
          <p className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-slate-300">
            <strong>Techwave Ventures Private Limited</strong><br />
            Email: <a href="mailto:contact@techwaveventures.in" className="text-blue-400 hover:underline">contact@techwaveventures.in</a><br />
            Website: <a href="https://techwaveventures.in" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">techwaveventures.in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
