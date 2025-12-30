'use client';

/**
 * AutoForge Landing Page - "The Shopify for Software"
 *
 * File: src/app/page.tsx
 *
 * Updated to showcase:
 * - Complex app generation (bots, trading systems, scrapers)
 * - Instant monetization
 * - Marketplace for selling apps
 * - Full "Shopify for Software" positioning
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  Zap,
  Code2,
  Layers,
  Rocket,
  Github,
  Play,
  Check,
  ChevronRight,
  Terminal,
  Wand2,
  Globe,
  Shield,
  Clock,
  Users,
  Bot,
  TrendingUp,
  DollarSign,
  Store,
  ShoppingBag,
  Coins,
  BarChart3,
  MessageSquare,
  Workflow
} from 'lucide-react';

// Animated gradient orbs component
function GradientOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-[100px] animate-blob" />
      <div className="absolute top-40 -left-40 w-80 h-80 bg-blue-500/30 rounded-full blur-[100px] animate-blob animation-delay-2000" />
      <div className="absolute -bottom-40 left-1/2 w-80 h-80 bg-cyan-500/30 rounded-full blur-[100px] animate-blob animation-delay-4000" />
    </div>
  );
}

// Grid pattern background
function GridPattern() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
  );
}

// Example prompts that cycle - UPDATED with complex apps
const examplePrompts = [
  "A Discord moderation bot with auto-ban and logging",
  "A crypto trading bot with technical indicators",
  "A LinkedIn automation tool for lead generation",
  "A full SaaS CRM with teams and billing",
  "A web scraper for price monitoring",
  "A Twitter bot for automated engagement",
];

// Typing animation component
function TypingPrompt() {
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const prompt = examplePrompts[currentPrompt];

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < prompt.length) {
          setDisplayText(prompt.slice(0, displayText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentPrompt((prev) => (prev + 1) % examplePrompts.length);
        }
      }
    }, isDeleting ? 30 : 50);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentPrompt]);

  return (
    <span className="text-gray-400">
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

// Feature card component
function FeatureCard({
  icon: Icon,
  title,
  description
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

// Stats component - UPDATED
function Stats() {
  const stats = [
    { value: '10K+', label: 'Apps Generated' },
    { value: '1K+', label: 'Creators Earning' },
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '<90s', label: 'Generation Time' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {stats.map((stat, i) => (
        <div key={i} className="text-center">
          <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
          <div className="text-gray-400 text-sm">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');

  const handleGenerate = () => {
    if (session) {
      router.push(`/dashboard?prompt=${encodeURIComponent(prompt)}`);
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen text-white overflow-hidden">
      {/* Background Effects */}
      <GradientOrbs />
      <GridPattern />

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/BASED IN.png"
                  alt="AutoForge Logo"
                  width={50}
                  height={50}
                  className="rounded-lg"
                />
                <span className="font-bold text-xl">AutoForge</span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                <Link href="/marketplace" className="px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                  Marketplace
                </Link>
                <Link href="/showcase" className="px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                  Showcase
                </Link>
                <Link href="/docs" className="px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                  Docs
                </Link>
                <Link href="/pricing" className="px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                  Pricing
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {session ? (
                <Link
                  href="/dashboard"
                  className="px-4 py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - UPDATED */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 text-sm text-violet-300 mb-8">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>The Shopify for Software</span>
              <ChevronRight className="w-4 h-4" />
            </div>

            {/* Headline - UPDATED */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Build. Monetize.
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Sell Software.
              </span>
            </h1>

            {/* Subheadline - UPDATED */}
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              Generate production-ready apps from a single prompt. Discord bots, trading systems,
              scrapers, SaaS platforms. Monetize instantly and sell on our marketplace.
            </p>

            {/* Main Input */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-50 transition-opacity" />
                <div className="relative bg-[#1A1A1C] border border-white/10 rounded-xl p-2">
                  <div className="flex items-center">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && prompt && handleGenerate()}
                        className="w-full bg-transparent text-white placeholder:text-gray-500 px-4 py-3 text-lg focus:outline-none"
                      />
                      {!prompt && (
                        <div className="absolute inset-0 px-4 py-3 text-lg pointer-events-none">
                          <TypingPrompt />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleGenerate}
                      disabled={!prompt}
                      className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Wand2 className="w-5 h-5" />
                      Generate
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick examples - UPDATED with complex apps */}
            <div className="flex flex-wrap justify-center gap-2">
              {['Discord Bot', 'Trading Bot', 'Web Scraper', 'SaaS Platform', 'Automation Tool'].map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(`A ${example.toLowerCase()}`)}
                  className="px-4 py-2 text-sm text-gray-400 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:text-white transition-all"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NEW: Complex App Types Section */}
      <section className="relative py-20 border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Build Complex Applications
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Not just simple dashboards. Generate production-grade bots, trading systems,
              scrapers, and full SaaS platforms.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { icon: Bot, label: 'Discord Bots', desc: '5 platforms' },
              { icon: TrendingUp, label: 'Trading Bots', desc: 'Crypto & stocks' },
              { icon: Workflow, label: 'Web Scrapers', desc: 'Automated data' },
              { icon: MessageSquare, label: 'Social Automation', desc: 'Multi-platform' },
              { icon: Layers, label: 'SaaS Platforms', desc: 'Full-stack' },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition-all group">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <item.icon className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="font-semibold text-white mb-1">{item.label}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW: Monetization Section */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-sm text-green-400 mb-6">
                <DollarSign className="w-4 h-4" />
                <span>Instant Monetization</span>
              </div>
              <h2 className="text-4xl font-bold mb-6">
                Turn Your Apps Into Revenue
              </h2>
              <p className="text-lg text-gray-400 mb-8">
                One-click Stripe Connect integration. Set your price, connect your bank,
                and start earning within minutes. AutoForge handles payments, hosting, and customer management.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Check, text: 'Instant Stripe Connect setup (2 minutes)' },
                  { icon: Check, text: 'Automatic revenue splitting (90% yours)' },
                  { icon: Check, text: 'Weekly payouts to your bank account' },
                  { icon: Check, text: 'Real-time analytics dashboard' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-3xl" />
              <div className="relative bg-[#1A1A1C] border border-white/10 rounded-2xl p-8">
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Monthly Revenue</div>
                    <div className="text-4xl font-bold text-white">$4,250</div>
                    <div className="text-sm text-green-400 mt-1">+23% vs last month</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-2xl font-bold text-white">156</div>
                      <div className="text-xs text-gray-500">Customers</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-2xl font-bold text-white">$27</div>
                      <div className="text-xs text-gray-500">Avg. Revenue/Customer</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-4 border-t border-white/10">
                    <span className="text-gray-400">Next payout in 3 days</span>
                    <span className="text-green-400 font-semibold">$1,250</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW: Marketplace Section */}
      <section className="relative py-24 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-2xl blur-3xl" />
              <div className="relative bg-[#1A1A1C] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-white">Marketplace Apps</h3>
                  <Store className="w-5 h-5 text-violet-400" />
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'Discord Moderation Pro', price: '$19/mo', sales: 89 },
                    { name: 'Crypto Alert Bot', price: '$29/mo', sales: 67 },
                    { name: 'LinkedIn Lead Gen', price: '$49/mo', sales: 45 },
                  ].map((app, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-4 flex items-center justify-between hover:bg-white/10 transition-all">
                      <div>
                        <div className="font-medium text-white">{app.name}</div>
                        <div className="text-sm text-gray-500">{app.sales} sales</div>
                      </div>
                      <div className="text-violet-400 font-semibold">{app.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-400 mb-6">
                <ShoppingBag className="w-4 h-4" />
                <span>App Marketplace</span>
              </div>
              <h2 className="text-4xl font-bold mb-6">
                Sell on Our Marketplace
              </h2>
              <p className="text-lg text-gray-400 mb-8">
                List your generated apps on the AutoForge marketplace. Reach thousands of potential
                customers looking for ready-made solutions. No marketing required.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Users, text: '10,000+ active buyers browsing daily' },
                  { icon: Coins, text: 'Automatic customer management & support' },
                  { icon: BarChart3, text: 'Built-in analytics and performance tracking' },
                  { icon: Zap, text: 'List your app in under 5 minutes' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-violet-400" />
                    </div>
                    <span className="text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Video / Screenshot Section */}
      <section className="relative py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#1A1A1C] shadow-2xl">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-white/5 text-xs text-gray-500">
                  autoforge.dev
                </div>
              </div>
            </div>
            {/* Content */}
            <div className="aspect-video bg-gradient-to-br from-violet-900/20 via-indigo-900/20 to-cyan-900/20 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
                <p className="text-gray-400">Watch AutoForge in action</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid - UPDATED */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to ship and sell
            </h2>
            <p className="text-lg text-gray-400">
              From idea to monetized product in minutes. AutoForge handles the complexity
              so you can focus on building and earning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Bot}
              title="Complex App Generation"
              description="Discord bots, trading systems, web scrapers, automation tools. Not just simple dashboards."
            />
            <FeatureCard
              icon={Code2}
              title="Production-Ready Code"
              description="Get clean, type-safe TypeScript code with best practices. 30-50+ files per app, fully functional."
            />
            <FeatureCard
              icon={DollarSign}
              title="Instant Monetization"
              description="One-click Stripe Connect setup. Start charging for your apps within 2 minutes. 90% revenue share."
            />
            <FeatureCard
              icon={Store}
              title="Built-in Marketplace"
              description="List your apps on our marketplace. Reach thousands of buyers without any marketing effort."
            />
            <FeatureCard
              icon={Rocket}
              title="Auto-Deploy & Hosting"
              description="Automatic deployment to Vercel with 99.9% uptime SLA. Your customers get instant access."
            />
            <FeatureCard
              icon={BarChart3}
              title="Creator Dashboard"
              description="Real-time analytics, revenue tracking, customer management, and payout history in one place."
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Stats />
        </div>
      </section>

      {/* How It Works - UPDATED */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-lg text-gray-400">
              Four simple steps to go from idea to earning revenue
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Describe',
                description: 'Tell us what you want to build. Be specific about features and functionality.',
                icon: Terminal,
              },
              {
                step: '02',
                title: 'Generate',
                description: 'AI generates 30-50+ production files with complete functionality in 60-90 seconds.',
                icon: Sparkles,
              },
              {
                step: '03',
                title: 'Monetize',
                description: 'Connect Stripe, set your price ($X/month or one-time), and publish to marketplace.',
                icon: DollarSign,
              },
              {
                step: '04',
                title: 'Earn',
                description: 'Receive weekly payouts as customers subscribe. Track revenue in real-time.',
                icon: TrendingUp,
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 3 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-white/20 to-transparent -translate-x-1/2" />
                )}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-white/10 mb-6">
                    <item.icon className="w-10 h-10 text-violet-400" />
                  </div>
                  <div className="text-violet-400 text-sm font-mono mb-2">{item.step}</div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - UPDATED */}
      <section className="relative py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/20 via-indigo-600/20 to-cyan-600/20 rounded-3xl blur-2xl" />
            <div className="relative bg-[#1A1A1C] border border-white/10 rounded-2xl p-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to start building and earning?
              </h2>
              <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">
                Join 1,000+ creators earning passive income by building and selling AI-generated apps.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href={session ? "/dashboard" : "/login"}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Start Building Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 px-8 py-4 text-white border border-white/20 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Store className="w-5 h-5" />
                  Browse Marketplace
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/BASED IN.png"
                alt="AutoForge Logo"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="font-semibold">AutoForge</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
              <Link href="https://github.com" className="hover:text-white transition-colors">GitHub</Link>
            </div>
            <div className="text-sm text-gray-500">
              © 2024 AutoForge. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
