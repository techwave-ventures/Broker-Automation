'use client';

import React, { useEffect, useState, useRef } from 'react';
import Script from 'next/script';

declare const FB: any;
declare global {
  interface Window {
    fbAsyncInit?: () => void;
  }
}

interface WhatsAppEmbeddedSignupProps {
  appId?: string;
  configId?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export function WhatsAppEmbeddedSignup({
  appId = process.env.NEXT_PUBLIC_FB_APP_ID || '',
  configId = process.env.NEXT_PUBLIC_FB_CONFIG_ID || '',
  onSuccess,
  onError,
}: WhatsAppEmbeddedSignupProps) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sessionInfoRef = useRef<any>(null);
  const codeRef = useRef<string | null>(null);

  const initFB = () => {
    if (typeof FB !== 'undefined' && appId) {
      try {
        FB.init({
          appId: appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v22.0',
        });
        setSdkLoaded(true);
      } catch (e) {
        console.error('FB.init error:', e);
      }
    }
  };

  useEffect(() => {
    if (typeof FB !== 'undefined') {
      initFB();
    } else {
      window.fbAsyncInit = initFB;
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('facebook.com')) return;

      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.event === 'FINISH' || data.data?.waba_id) {
            sessionInfoRef.current = data.data;
            if (codeRef.current && sessionInfoRef.current) {
              const currentCode = codeRef.current;
              handleTokenExchange(currentCode, sessionInfoRef.current);
            }
          }
        }
      } catch (err) {
        // Ignore non-JSON postMessages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [appId]);

  const handleTokenExchange = async (code: string, sessionInfo: any) => {
    setStatusText('Connecting WhatsApp account...');
    setLoading(true);
    try {
      const res = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          app_id: appId,
          waba_id: sessionInfo?.waba_id,
          phone_number_id: sessionInfo?.phone_number_id,
          business_id: sessionInfo?.business_id,
          waba_ids: sessionInfo?.waba_id ? [sessionInfo.waba_id] : [],
          es_option_reg: true,
          es_option_sub: true,
          es_option_calling: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const detailMsg = data.details?.message || data.message || data.error || 'Failed to exchange token';
        throw new Error(detailMsg);
      }

      setStatusText('WhatsApp account connected successfully!');
      if (onSuccess) onSuccess(data);
    } catch (err: any) {
      console.error('Token exchange error:', err);
      const msg = err.message || 'Token exchange failed. Please check app credentials.';
      setErrorMsg(msg);
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const launchSignup = () => {
    setErrorMsg(null);
    setLoading(true);
    setStatusText('Launching WhatsApp Embedded Signup...');
    sessionInfoRef.current = null;
    codeRef.current = null;

    if (!appId) {
      const msg = 'Missing NEXT_PUBLIC_FB_APP_ID in .env.local';
      setErrorMsg(msg);
      setLoading(false);
      setStatusText(null);
      return;
    }

    if (!configId) {
      const msg = 'Missing NEXT_PUBLIC_FB_CONFIG_ID in .env.local';
      setErrorMsg(msg);
      setLoading(false);
      setStatusText(null);
      return;
    }

    if (typeof FB === 'undefined') {
      const msg = 'Facebook SDK is loading or blocked by a browser ad-blocker extension. Please refresh or disable ad-blocker.';
      setErrorMsg(msg);
      setLoading(false);
      setStatusText(null);
      return;
    }

    try {
      FB.init({
        appId: appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v22.0',
      });

      const loginOptions: any = {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          sessionInfoVersion: '3',
          setup: {
            config_id: configId,
          },
        },
      };

      FB.login(
        (response: any) => {
          if (response.authResponse?.code) {
            const authCode = String(response.authResponse.code);
            codeRef.current = authCode;
            if (sessionInfoRef.current) {
              handleTokenExchange(authCode, sessionInfoRef.current);
            } else {
              handleTokenExchange(authCode, {});
            }
          } else {
            setLoading(false);
            setStatusText(null);
            if (response.status !== 'unknown') {
              setErrorMsg('Embedded signup popup was closed or cancelled.');
            }
          }
        },
        loginOptions
      );
    } catch (err: any) {
      console.error('FB.login error:', err);
      setLoading(false);
      setStatusText(null);
      setErrorMsg(err.message || 'Failed to open Facebook Login popup. Please try again.');
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Load Facebook JS SDK using Next.js Script component */}
      <Script
        id="facebook-jssdk"
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="lazyOnload"
        onLoad={initFB}
      />

      {errorMsg && (
        <div className="w-full mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {statusText && (
        <div className="w-full mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{statusText}</span>
        </div>
      )}

      <button
        type="button"
        onClick={launchSignup}
        disabled={loading}
        className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Connecting WhatsApp...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>Connect WhatsApp Account</span>
          </>
        )}
      </button>
    </div>
  );
}
