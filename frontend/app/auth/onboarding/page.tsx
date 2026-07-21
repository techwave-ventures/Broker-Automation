'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WhatsAppEmbeddedSignup } from '@/components/WhatsAppEmbeddedSignup';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(2);
  const [connectedData, setConnectedData] = useState<any>(null);

  const handleSignupSuccess = (result: any) => {
    setConnectedData(result);
    setStep(3);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="w-full max-w-xl bg-slate-900/85 backdrop-blur-xl border border-slate-800 p-8 sm:p-10 rounded-3xl shadow-2xl animate-fade-in-up z-10">
        
        {/* Step Progress Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              1
            </div>
            <span className="text-xs font-medium text-slate-300">Account</span>
          </div>

          <div className={`flex-1 h-0.5 mx-3 ${step >= 2 ? 'bg-emerald-500/80' : 'bg-slate-800'}`} />

          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 2 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              2
            </div>
            <span className="text-xs font-medium text-slate-300">WhatsApp Login</span>
          </div>

          <div className={`flex-1 h-0.5 mx-3 ${step >= 3 ? 'bg-emerald-500/80' : 'bg-slate-800'}`} />

          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 3 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              3
            </div>
            <span className="text-xs font-medium text-slate-300">Ready</span>
          </div>
        </div>

        {/* Step 2: Connect WhatsApp Account */}
        {step === 2 && (
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Connect your WhatsApp Business</h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Log in with Facebook to onboard your WhatsApp Business Account (WABA) and start managing customer conversations automatically.
              </p>
            </div>

            <div className="pt-4 pb-2">
              <WhatsAppEmbeddedSignup onSuccess={handleSignupSuccess} />
            </div>

            <div className="pt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline underline-offset-4"
              >
                Skip for now, I'll connect my WhatsApp account later
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success Screen */}
        {step === 3 && (
          <div className="space-y-6 text-center animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">WhatsApp Connected!</h2>
              <p className="text-sm text-slate-400 mt-2">
                Your WhatsApp Business Account has been successfully linked. AI bots and webhooks are ready.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Status:</span>
                <span className="text-emerald-400 font-semibold">Active & Connected</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Automated Bot:</span>
                <span className="text-slate-200">Enabled</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
