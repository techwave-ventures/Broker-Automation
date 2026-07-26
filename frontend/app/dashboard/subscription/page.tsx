"use client";

import { useState, useEffect } from "react";
import { Crown, Check, Zap, ArrowRight, Loader2, RefreshCw } from "lucide-react";

interface BillingStatus {
  plan_type: string;
  credits_balance: number;
  auto_recharge_enabled: boolean;
  auto_recharge_amount: number;
  subscription_status: string;
  current_period_end: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashfreeAppId, setCashfreeAppId] = useState<string>("");
  const [cashfreeEnv, setCashfreeEnv] = useState<string>("sandbox");

  // Top-up form state
  const [topUpCredits, setTopUpCredits] = useState<number>(5000);
  const [topUpRate, setTopUpRate] = useState<number>(1.0);
  const [topUpCost, setTopUpCost] = useState<number>(5000);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  // Auto recharge settings form state
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(true);
  const [autoRechargeAmount, setAutoRechargeAmount] = useState(5000);

  // Upgrade form auto recharge states
  const [upgradeAutoRechargeAmount, setUpgradeAutoRechargeAmount] = useState(5000);
  const [upgradeAutoRechargeThreshold, setUpgradeAutoRechargeThreshold] = useState(200);

  // Load Cashfree Script
  const loadCashfreeScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Cashfree) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const fetchBillingData = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const response = await fetch(`${backendUrl}/api/billing/status`, {
        headers: {
          // In local dev, requireAuth is bypassed or uses local-dev session
          "Authorization": "Bearer local-dev",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
        setTransactions(data.transactions || []);
        setCashfreeAppId(data.cashfreeAppId || "");
        setCashfreeEnv(data.cashfreeEnv || "sandbox");
        setAutoRechargeEnabled(data.status.auto_recharge_enabled);
        setAutoRechargeAmount(data.status.auto_recharge_amount);
      }
    } catch (err) {
      console.error("Failed to load billing status", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  // Update dynamic top-up pricing
  useEffect(() => {
    if (!status) return;
    const plan = status.plan_type || "free";
    let rate = 1.0;

    if (plan === "custom") {
      if (topUpCredits < 5000) {
        setTopUpError("Custom Plan top-ups must be at least 5,000 credits.");
        setTopUpRate(0.9);
        setTopUpCost(topUpCredits * 0.9);
        return;
      } else {
        setTopUpError(null);
      }

      if (topUpCredits >= 10000) {
        rate = 0.8;
      } else {
        rate = 0.9;
      }
    } else {
      rate = 1.0;
      setTopUpError(null);
    }

    setTopUpRate(rate);
    setTopUpCost(topUpCredits * rate);
  }, [topUpCredits, status]);

  // Handle Standard Subscription Upgrade
  const handleUpgradeSubscription = async () => {
    setSubmitting(true);
    try {
      const scriptLoaded = await loadCashfreeScript();
      if (!scriptLoaded) {
        alert("Failed to load Cashfree SDK. Please check your internet connection.");
        setSubmitting(false);
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const response = await fetch(`${backendUrl}/api/billing/subscribe`, {
        method: "POST",
        headers: {
          "Authorization": "Bearer local-dev",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          autoRechargeAmount: upgradeAutoRechargeAmount,
          autoRechargeThreshold: upgradeAutoRechargeThreshold,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Subscription creation failed");
      }

      const cashfree = (window as any).Cashfree({
        mode: cashfreeEnv === "production" ? "production" : "sandbox",
      });

      cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: "_modal",
      }).then(() => {
        alert("Subscription window closed. Checking authorization status...");
        fetchBillingData();
      });
    } catch (err: any) {
      alert(`Subscription Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Credit Topup Payment
  const handleTopUpPayment = async () => {
    if (status?.plan_type === "custom" && topUpCredits < 5000) {
      alert("Custom plan orders must be 5,000 credits or more.");
      return;
    }

    setSubmitting(true);
    try {
      const scriptLoaded = await loadCashfreeScript();
      if (!scriptLoaded) {
        alert("Failed to load Cashfree SDK.");
        setSubmitting(false);
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const response = await fetch(`${backendUrl}/api/billing/topup`, {
        method: "POST",
        headers: {
          "Authorization": "Bearer local-dev",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credits: topUpCredits }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Top-up order creation failed");
      }

      const cashfree = (window as any).Cashfree({
        mode: cashfreeEnv === "production" ? "production" : "sandbox",
      });

      cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: "_modal",
      }).then(() => {
        alert(`Payment window closed. Updating credit balance...`);
        fetchBillingData();
      });
    } catch (err: any) {
      alert(`Top-up Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Save Auto-Recharge preferences
  const handleSaveAutoRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const response = await fetch(`${backendUrl}/api/billing/auto-recharge/settings`, {
        method: "POST",
        headers: {
          "Authorization": "Bearer local-dev",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auto_recharge_enabled: autoRechargeEnabled,
          auto_recharge_amount: autoRechargeAmount,
        }),
      });

      if (response.ok) {
        alert("Auto-recharge configuration updated successfully.");
        fetchBillingData();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Update failed");
      }
    } catch (err: any) {
      alert(`Auto-recharge update failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-foreground/60">Loading billing profile...</span>
      </div>
    );
  }

  const isSubscribed = status?.subscription_status === "active";
  const planTypeUpper = (status?.plan_type || "free").toUpperCase();

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription & Credits</h1>
          <p className="text-foreground/60 text-sm mt-1">Manage plans, credit top-ups, and auto-refill triggers</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
          <Crown className="h-4 w-4" />
          {planTypeUpper} Plan — {isSubscribed ? "Active" : "Inactive / Trial"}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Credits Remaining */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
          <div className="text-foreground/50 text-sm font-medium">Credits Remaining</div>
          <div className="text-4xl font-extrabold text-primary">
            {status?.credits_balance ?? 0}
          </div>
          <p className="text-xs text-foreground/50">
            Required to send automated WhatsApp messages and generate Gemini AI replies.
          </p>
        </div>

        {/* Plan & Renewal Details */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
          <div className="text-foreground/50 text-sm font-medium">Subscription Renewal</div>
          <div className="text-lg font-bold">
            {isSubscribed && status?.current_period_end
              ? new Date(status.current_period_end).toLocaleDateString()
              : "No Active Subscription"}
          </div>
          <p className="text-xs text-foreground/50">
            {isSubscribed ? "Old credits will expire, and 3,000 new plan credits will be loaded." : "Upgrade below to activate monthly subscription."}
          </p>
        </div>

        {/* Charge Rules */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-2 text-xs">
          <div className="text-foreground/50 text-sm font-medium mb-1">Billing Quotas</div>
          <div className="flex justify-between">
            <span className="text-foreground/60">Gemini LLM Reply</span>
            <span className="font-semibold text-green-500">Free (Checks Balance &gt; 0)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/60">Service/Utility WhatsApp Msg</span>
            <span className="font-semibold">1 Credit</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/60">Marketing WhatsApp Msg</span>
            <span className="font-semibold text-accent">3 Credits</span>
          </div>
        </div>
      </div>

      {/* Payment / Upgrade & Refills */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Plans Upgrade */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xl mb-2">Upgrade Plan</h3>
            <p className="text-sm text-foreground/50 mb-4">Choose the plan that fits your business outreach scale</p>
            
            <div className="border border-border rounded-xl p-4 bg-background/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Standard Plan</span>
                <span className="bg-green-500/10 text-green-500 text-xs px-2.5 py-0.5 rounded-full font-semibold">Recommended</span>
              </div>
              <div className="text-2xl font-extrabold text-foreground">₹2,999<span className="text-xs font-normal text-foreground/60"> / month</span></div>
              
              <ul className="space-y-2 text-sm text-foreground/80 pt-2 pb-2">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 3,000 credits included monthly (expire monthly)</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Standard extra top-ups at ₹1.00 / credit</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Full access to bot configs & templates</li>
              </ul>
              
              <div className="pt-4 border-t border-border/80 space-y-3">
                <p className="text-xs font-bold text-foreground/75 uppercase tracking-wider">Configure Auto-Refill (Autopay)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-foreground/50 block mb-1">Refill Credit Amount</label>
                    <select
                      value={upgradeAutoRechargeAmount}
                      onChange={(e) => setUpgradeAutoRechargeAmount(parseInt(e.target.value, 10))}
                      className="w-full bg-background border border-border rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
                    >
                      <option value={1000}>1,000 Credits (₹1,000)</option>
                      <option value={3000}>3,000 Credits (₹3,000)</option>
                      <option value={5000}>5,000 Credits (₹4,500)</option>
                      <option value={10000}>10,000 Credits (₹8,000)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-foreground/50 block mb-1">Trigger Threshold</label>
                    <select
                      value={upgradeAutoRechargeThreshold}
                      onChange={(e) => setUpgradeAutoRechargeThreshold(parseInt(e.target.value, 10))}
                      className="w-full bg-background border border-border rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
                    >
                      <option value={100}>Below 100 cr.</option>
                      <option value={200}>Below 200 cr.</option>
                      <option value={500}>Below 500 cr.</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleUpgradeSubscription}
            disabled={submitting || status?.plan_type === "standard"}
            className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Zap className="h-4 w-4" />
                {status?.plan_type === "standard" ? "Current Standard Plan" : "Upgrade to Standard"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Credit Top Up */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xl mb-2">Refill Pre-paid Credits</h3>
            <p className="text-sm text-foreground/50 mb-4">Add credits to avoid service interruptions. Rate depends on plan & tiers.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground/70 block mb-2">Number of Credits</label>
                <input
                  type="number"
                  value={topUpCredits}
                  onChange={(e) => setTopUpCredits(parseInt(e.target.value, 10) || 0)}
                  min={status?.plan_type === "custom" ? 5000 : 1}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:border-primary"
                />
                {topUpError && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{topUpError}</p>
                )}
              </div>

              {/* Tiers Pricing Info */}
              <div className="bg-background/40 p-4 border border-border rounded-xl space-y-2 text-xs">
                <div className="font-semibold text-foreground/80 mb-1">Volume Pricing Tiers:</div>
                <div className="flex justify-between text-foreground/60">
                  <span>Standard / Free plan</span>
                  <span>₹1.00 / credit</span>
                </div>
                <div className="flex justify-between text-foreground/60">
                  <span>Custom plan (&gt;= 5,000 credits)</span>
                  <span>₹0.90 / credit</span>
                </div>
                <div className="flex justify-between text-foreground/60">
                  <span>Custom plan (&gt;= 10,000 credits)</span>
                  <span>₹0.80 / credit</span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-border pt-4">
                <div>
                  <div className="text-xs text-foreground/50">Current Rate</div>
                  <div className="font-bold">₹{topUpRate.toFixed(2)} / credit</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-foreground/50">Total Amount Payable</div>
                  <div className="text-2xl font-extrabold text-primary">₹{topUpCost.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleTopUpPayment}
            disabled={submitting || !!topUpError}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Purchase Credits
              </>
            )}
          </button>
        </div>
      </div>

      {/* Auto Recharge Settings */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-bold text-xl mb-2">Auto-Refill Settings</h3>
        <p className="text-sm text-foreground/50 mb-6">Automatically refill credits whenever balance drops below 200 to prevent bot downtime</p>
        
        <form onSubmit={handleSaveAutoRecharge} className="space-y-4 max-w-lg">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoRechargeCheck"
              checked={autoRechargeEnabled}
              onChange={(e) => setAutoRechargeEnabled(e.target.checked)}
              className="h-4.5 w-4.5 text-primary rounded border-border focus:ring-primary bg-background"
            />
            <label htmlFor="autoRechargeCheck" className="text-sm font-semibold text-foreground/80">
              Enable Auto-Refill (Trigger below 200 credits)
            </label>
          </div>

          {autoRechargeEnabled && (
            <div>
              <label className="text-sm font-medium text-foreground/70 block mb-1.5">Refill Credit Amount</label>
              <select
                value={autoRechargeAmount}
                onChange={(e) => setAutoRechargeAmount(parseInt(e.target.value, 10))}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 font-semibold focus:outline-none focus:border-primary"
              >
                <option value={1000}>1,000 Credits (₹1,000 standard)</option>
                <option value={3000}>3,000 Credits (₹3,000 standard)</option>
                <option value={5000}>5,000 Credits (₹4,500 custom rate)</option>
                <option value={10000}>10,000 Credits (₹8,000 custom rate)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Refill Configuration"}
          </button>
        </form>
      </div>

      {/* Transaction History */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-xl">Transaction Logs</h3>
          <button onClick={fetchBillingData} className="p-2 text-foreground/60 hover:text-foreground">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 text-foreground/40 text-sm">No transaction records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-foreground/50">
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Transaction Type</th>
                  <th className="py-3 px-4 font-semibold">Amount (Credits)</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/50 hover:bg-background/25">
                    <td className="py-3.5 px-4 text-foreground/80">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-medium uppercase text-xs">
                      <span className={`px-2 py-0.5 rounded-full ${
                        tx.amount > 0 
                          ? "bg-green-500/10 text-green-600" 
                          : "bg-red-500/10 text-red-600"
                      }`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 font-bold ${tx.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </td>
                    <td className="py-3.5 px-4 text-foreground/60">{tx.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
