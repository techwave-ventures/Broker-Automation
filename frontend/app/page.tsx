import Link from "next/link";
import { getSessionUser } from "@/lib/api";
import {
  ArrowRight,
  BotMessageSquare,
  Building2,
  LineChart,
  Sparkles,
  Check,
  MessageSquare,
  Users,
  Zap,
  Shield,
  Globe,
  Star,
  Phone,
  Bell,
  CalendarCheck,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/* ─── WhatsApp Phone Mockup ─────────────────────────────────────── */
const WA_MSGS = [
  { from: "user", text: "Hi, I'm looking for a 3 BHK in Baner under ₹1 Crore 🏠", time: "10:02", seen: true },
  { from: "bot", text: "Great choice! We have 3 stunning options in Baner within your budget. What's your preferred floor — high-rise or low-rise?", time: "10:02", seen: false },
  { from: "user", text: "High-rise, with a good view 🏙️", time: "10:03", seen: true },
  { from: "bot", text: "Perfect! Found a 14th-floor 3 BHK (1450 sqft) at ₹85L in Baner with city views. Want to schedule a site visit?", time: "10:03", seen: false },
  { from: "user", text: "Yes! Saturday at 11 AM works 👍", time: "10:04", seen: true },
  { from: "bot", text: "✅ Done! Visit confirmed for Sat 11 AM. You'll get a reminder 1 hr before. See you there!", time: "10:04", seen: false },
] as const;

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[270px]">
      {/* Phone shell */}
      <div
        className="relative rounded-[44px] overflow-hidden border-[3px] border-white/10"
        style={{
          background: "#1a1a2e",
          boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#1a1a2e] rounded-b-2xl z-20 flex items-center justify-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </div>

        {/* Screen */}
        <div className="flex flex-col" style={{ height: "580px" }}>
          {/* WA Status bar */}
          <div className="h-6 bg-[#075E54] flex items-center justify-between px-4 flex-shrink-0">
            <span className="text-[9px] text-white/80 font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5 items-end">
                {[1, 2, 3].map((b) => (
                  <div key={b} className="w-0.5 bg-white/70 rounded-sm" style={{ height: `${b * 3}px` }} />
                ))}
              </div>
              <svg className="h-2.5 w-3" viewBox="0 0 24 24" fill="white" opacity="0.7">
                <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4 2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
              </svg>
              <svg className="h-2.5 w-4" viewBox="0 0 24 24" fill="white" opacity="0.7">
                <rect x="2" y="7" width="18" height="11" rx="2" ry="2" />
                <path d="M22 11v3" />
              </svg>
            </div>
          </div>

          {/* WA Header */}
          <div className="bg-[#075E54] px-3 py-2.5 flex items-center gap-2.5 flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-[#128C7E] flex items-center justify-center flex-shrink-0">
              <BotMessageSquare style={{ height: "18px", width: "18px", color: "white" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold leading-none">PropBot Assistant</p>
              <p className="text-[10px] text-white/70 mt-0.5">online</p>
            </div>
            <Phone className="h-3.5 w-3.5 text-white/80" />
          </div>

          {/* Chat area */}
          <div
            className="flex-1 overflow-hidden px-2 pt-3 pb-2 flex flex-col gap-1.5"
            style={{ backgroundColor: "#111b21" }}
          >
            {/* Date pill */}
            <div className="flex justify-center mb-1">
              <span className="bg-[#182229] text-white/50 text-[9px] px-2 py-0.5 rounded-full">Today</span>
            </div>

            {WA_MSGS.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`relative px-2 py-1.5 rounded-lg max-w-[195px] text-[10px] leading-snug shadow-sm ${msg.from === "user"
                      ? "bg-[#005C4B] text-white rounded-tr-none"
                      : "bg-[#202C33] text-white/90 rounded-tl-none"
                    }`}
                >
                  {msg.text}
                  <div className="flex items-center justify-end gap-0.5 mt-0.5">
                    <span className="text-[8px] text-white/40">{msg.time}</span>
                    {msg.from === "user" && (
                      <svg viewBox="0 0 18 11" className="h-2.5 w-3.5" fill={msg.seen ? "#53bdeb" : "rgba(255,255,255,0.4)"}>
                        <path d="M17.394.066l-8.91 9.656-2.584-2.524-.966.966L8.484 11l9.31-10.083zM10.97.066L2.06 9.722l-1.99-1.99L.004 8.7l2.056 2.056L11.936.066zM.393 9.722l-.389.389L1.066 11l.389-.389z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            <div className="flex justify-start mt-1">
              <div className="bg-[#202C33] px-3 py-2 rounded-lg rounded-tl-none flex items-center gap-1">
                {[0, 150, 300].map((d) => (
                  <div
                    key={d}
                    className="h-1.5 w-1.5 rounded-full bg-white/30 animate-bounce"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* WA Input bar */}
          <div className="bg-[#111b21] px-2 py-2 flex items-center gap-2 flex-shrink-0">
            <div className="flex-1 bg-[#202C33] rounded-full px-3 py-1.5 flex items-center">
              <span className="text-[10px] text-white/25">Message</span>
            </div>
            <div className="h-7 w-7 rounded-full bg-[#00A884] flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="white">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </div>
          </div>

          {/* Home bar */}
          <div className="bg-[#111b21] flex justify-center pb-2 pt-0.5 flex-shrink-0">
            <div className="h-1 w-24 rounded-full bg-white/20" />
          </div>
        </div>
      </div>

      {/* Side buttons */}
      <div className="absolute top-24 -right-0.5 w-0.5 h-10 bg-white/10 rounded-full" />
      <div className="absolute top-20 -left-0.5 w-0.5 h-6 bg-white/10 rounded-full" />
      <div className="absolute top-28 -left-0.5 w-0.5 h-6 bg-white/10 rounded-full" />

      {/* Ambient glow */}
      <div className="absolute inset-0 -z-10 scale-110 bg-[#075E54]/20 blur-3xl rounded-full" />
    </div>
  );
}

/* ─── Section Label ─────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400 text-sm font-semibold mb-6">
      <Sparkles className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

/* ─── Data ──────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: BotMessageSquare, color: "text-blue-500", bg: "bg-blue-500/10", title: "24/7 AI Lead Engagement", description: "PropBot responds to every inquiry instantly — day or night — on WhatsApp and your website, so you never miss a hot lead." },
  { icon: Building2, color: "text-emerald-500", bg: "bg-emerald-500/10", title: "Smart Property Matching", description: "The AI understands buyer preferences and automatically matches them to your best listings based on budget, location, and requirements." },
  { icon: CalendarCheck, color: "text-purple-500", bg: "bg-purple-500/10", title: "Auto-Schedule Viewings", description: "Buyers can book site visits directly through the chat. PropBot syncs with your calendar and sends reminders automatically." },
  { icon: LineChart, color: "text-orange-500", bg: "bg-orange-500/10", title: "Real-time Analytics", description: "Track lead quality, conversation rates, and top-performing listings on a beautiful dashboard — all in one place." },
  { icon: Globe, color: "text-cyan-500", bg: "bg-cyan-500/10", title: "Multi-Channel Presence", description: "Deploy your AI assistant on WhatsApp Business, your website chat widget, and more from a single dashboard." },
  { icon: Shield, color: "text-rose-500", bg: "bg-rose-500/10", title: "GDPR-Compliant & Secure", description: "All conversations and lead data are encrypted. Your clients' information stays private and fully protected." },
];

const HOW_IT_WORKS = [
  { icon: Building2, title: "List your properties", description: "Add your property listings with photos, details, and pricing. Takes less than 2 minutes per listing." },
  { icon: BotMessageSquare, title: "AI bot goes live", description: "PropBot learns your listings instantly. Activate it on WhatsApp and your website with one click." },
  { icon: MessageSquare, title: "Leads get engaged 24/7", description: "Every inquiry gets an instant, intelligent response. The bot qualifies leads and books viewings." },
  { icon: Users, title: "You close the deals", description: "Receive hot, pre-qualified leads in your dashboard. You focus on closing — PropBot handles the rest." },
];

const TESTIMONIALS = [
  { name: "Rajesh Kumar", role: "Director, Unity Properties", avatar: "RK", stars: 5, text: "PropBot doubled our lead response rate within the first week. We're converting 3x more inquiries into viewings now. An absolute game-changer." },
  { name: "Priya Sharma", role: "Senior Agent, Skyline Realty", avatar: "PS", stars: 5, text: "I used to miss leads when sleeping. Now my bot handles them at 2AM and I wake up to qualified viewings already booked. Incredible." },
  { name: "Anil Mehta", role: "Owner, AM Real Estate", avatar: "AM", stars: 5, text: "Setup took 15 minutes. Within 24 hours, the bot had already scheduled 4 site visits. The ROI is phenomenal for the price." },
];

const PLANS = [
  {
    name: "Starter", price: "₹999", description: "Perfect for individual agents",
    features: ["5 property listings", "100 AI conversations/mo", "WhatsApp bot", "Basic analytics", "Email support"],
    cta: "Get Started Free", highlighted: false,
  },
  {
    name: "Pro", price: "₹2,499", description: "For growing agencies", badge: "Most Popular",
    features: ["50 property listings", "Unlimited conversations", "WhatsApp + Website bot", "Advanced analytics", "Lead scoring", "Auto-schedule viewings", "Priority support"],
    cta: "Start Pro Trial", highlighted: true,
  },
  {
    name: "Enterprise", price: "₹7,499", description: "For large real estate orgs",
    features: ["Unlimited listings", "Unlimited conversations", "All channels", "Custom bot training", "CRM integrations", "5 team accounts", "Dedicated manager"],
    cta: "Contact Sales", highlighted: false,
  },
];

/* ─── Page ──────────────────────────────────────────────────────── */
export default async function HomePage() {
  const user = await getSessionUser();
  const isLoggedIn = !!user;
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden transition-colors duration-300">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 border-b border-foreground/5 bg-background/80 backdrop-blur-xl transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-500 flex items-center justify-center" style={{ boxShadow: "0 0 16px rgba(59,130,246,0.5)" }}>
              <BotMessageSquare className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">PropBot AI</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground/60">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Reviews</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-full transition-all hover:scale-105 active:scale-95"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors hidden sm:block">
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-full transition-all hover:scale-105 active:scale-95"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background blobs — blue in dark, soft in light */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 dark:bg-blue-900/10 rounded-full blur-3xl" />
        </div>

        {/* Dot grid */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.025] dark:opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Text */}
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400 text-xs font-semibold mb-8">
              <Zap className="h-3.5 w-3.5" />
              AI-powered real estate automation
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </div>

            <h1 className="text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Your AI agent that{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  never sleeps.
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-blue-400/50 to-transparent" />
              </span>
            </h1>

            <p className="text-lg text-foreground/60 leading-relaxed mb-10 max-w-xl">
              PropBot AI engages property buyers 24/7 on WhatsApp & your website, qualifies leads instantly, and books site visits — so you close more deals without lifting a finger.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white text-base px-7 py-4 rounded-2xl font-semibold transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]"
                >
                  Go to Dashboard <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/signup"
                    className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white text-base px-7 py-4 rounded-2xl font-semibold transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]"
                  >
                    Start for free <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center gap-2 bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 text-foreground text-base px-7 py-4 rounded-2xl font-semibold transition-colors"
                  >
                    View Demo Dashboard
                  </Link>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-5 mt-10">
              {[
                { text: "No credit card required" },
                { text: "5-min setup" },
                { text: "Cancel anytime" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-sm text-foreground/50">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          {/* Right — Phone Mockup */}
          <div className="relative hidden lg:flex justify-center items-center">
            <PhoneMockup />

            {/* Floating badge — top right */}
            <div className="absolute top-4 -right-6 bg-card border border-border shadow-xl backdrop-blur-xl rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Bell className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] text-foreground/50 leading-none">New lead qualified</p>
                <p className="text-xs font-bold text-emerald-500 mt-0.5">Priya Desai · Score 92</p>
              </div>
            </div>

            {/* Floating badge — bottom left */}
            <div className="absolute bottom-8 -left-6 bg-card border border-border shadow-xl backdrop-blur-xl rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <CalendarCheck className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] text-foreground/50 leading-none">Viewing booked</p>
                <p className="text-xs font-bold text-blue-500 mt-0.5">Saturday 11 AM · Baner</p>
              </div>
            </div>

            {/* Floating badge — mid right */}
            <div className="absolute bottom-32 -right-6 bg-card border border-border shadow-xl backdrop-blur-xl rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-[10px] text-foreground/50 leading-none">Leads today</p>
                <p className="text-xs font-bold text-purple-500 mt-0.5">+18 new · 6 qualified</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <section className="border-y border-foreground/5 bg-foreground/[0.02] py-12">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "12,000+", label: "Active Listings" },
            { value: "3.4M+", label: "AI Conversations" },
            { value: "94%", label: "Lead Response Rate" },
            { value: "6x", label: "More Viewings Booked" },
          ].map((stat, i) => (
            <div key={i}>
              <p className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-sm text-foreground/50 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-28 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <SectionLabel>Everything you need</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Built for modern{" "}
            <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
              real estate agents
            </span>
          </h2>
          <p className="text-foreground/50 mt-4 text-lg max-w-2xl mx-auto">
            Every feature is designed to save you time, increase your conversions, and help you scale without growing your team.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <div
              key={i}
              className="group bg-card border border-border hover:border-blue-500/30 rounded-2xl p-6 transition-all duration-300 cursor-default hover:shadow-lg hover:-translate-y-1"
            >
              <div className={`h-11 w-11 rounded-xl ${feature.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-foreground/55 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it Works ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 bg-foreground/[0.02] border-y border-foreground/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <SectionLabel>Simple setup</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Live in{" "}
              <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                under 15 minutes
              </span>
            </h2>
            <p className="text-foreground/50 mt-4 text-lg max-w-xl mx-auto">
              No technical skills needed. If you can fill a form, you can launch your AI bot.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent hidden lg:block" />
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="relative text-center">
                <div className="relative inline-flex flex-col items-center">
                  <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 relative z-10">
                    <step.icon className="h-7 w-7 text-blue-500" />
                  </div>
                  <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center z-20">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-foreground/50 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────── */}
      <section id="testimonials" className="py-28 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <SectionLabel>Loved by agents</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Real results from{" "}
            <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
              real agents
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-card border border-border hover:border-blue-500/20 rounded-2xl p-6 flex flex-col gap-4 transition-colors hover:shadow-lg">
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-foreground/70 text-sm leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-sm font-bold text-blue-500 flex-shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-foreground/50">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="py-28 bg-foreground/[0.02] border-y border-foreground/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <SectionLabel>Transparent pricing</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Plans that{" "}
              <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                grow with you
              </span>
            </h2>
            <p className="text-foreground/50 mt-4 text-lg">Start free. No hidden charges. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-7 flex flex-col transition-all ${plan.highlighted
                    ? "bg-blue-500 text-white shadow-[0_0_60px_rgba(59,130,246,0.25)]"
                    : "bg-card border border-border hover:border-blue-500/30 hover:shadow-lg"
                  }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className={`text-sm mt-0.5 ${plan.highlighted ? "text-blue-100" : "text-foreground/50"}`}>
                    {plan.description}
                  </p>
                  <div className="mt-4">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    <span className={`text-sm ml-1 ${plan.highlighted ? "text-blue-100" : "text-foreground/50"}`}>/month</span>
                  </div>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.highlighted ? "text-blue-100" : "text-emerald-500"}`} />
                      <span className={plan.highlighted ? "text-blue-50" : "text-foreground/70"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${plan.highlighted
                      ? "bg-white text-blue-600 hover:bg-blue-50"
                      : "bg-foreground/5 border border-border hover:bg-foreground/10 text-foreground"
                    }`}
                >
                  {plan.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className="py-32 max-w-4xl mx-auto px-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 bg-blue-500/5 dark:bg-blue-500/10 blur-3xl rounded-full scale-150" />
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Ready to automate your{" "}
            <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
              property sales?
            </span>
          </h2>
          <p className="text-foreground/50 text-lg mb-10 max-w-xl mx-auto">
            Join 2,000+ real estate agents who use PropBot AI to generate more leads and book more viewings — on autopilot.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white text-lg px-8 py-4 rounded-2xl font-bold transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(59,130,246,0.4)]"
          >
            Start for free — no card needed <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-foreground/5 bg-foreground/[0.01] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-xl bg-blue-500 flex items-center justify-center">
                  <BotMessageSquare className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold">PropBot AI</span>
              </div>
              <p className="text-sm text-foreground/40 leading-relaxed">
                The AI-powered real estate sales assistant that never sleeps. Built for modern property professionals.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              {[
                { heading: "Product", links: ["Features", "Pricing", "Demo", "Changelog"] },
                { heading: "Company", links: ["About", "Blog", "Careers", "Contact"] },
                { heading: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy"] },
              ].map((col) => (
                <div key={col.heading}>
                  <p className="font-semibold text-foreground/80 mb-3">{col.heading}</p>
                  <ul className="space-y-2">
                    {col.links.map((l) => (
                      <li key={l}>
                        <a href="#" className="text-foreground/40 hover:text-foreground/70 transition-colors">{l}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-foreground/5 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-foreground/30">
            <p>© {new Date().getFullYear()} PropBot AI. All rights reserved.</p>
            <p>Made with ❤️ for real estate professionals</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
