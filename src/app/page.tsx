'use client';

/**
 * AutoForge Landing Page - Minimal Version
 *
 * Inspired by bolt.new and v0.dev
 * Clean, focused, product-first
 */

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Zap,
  Rocket,
  DollarSign,
  Bot,
  TrendingUp,
  Workflow,
  MessageSquare,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    if (session) {
      router.push(`/generate?prompt=${encodeURIComponent(prompt)}`);
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Simple Navigation */}
      <nav className="border-b border-white/5 backdrop-blur-xl bg-[#0A0A0B]/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/BASED IN.png"
                alt="AutoForge"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-semibold text-lg">AutoForge</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/marketplace" className="text-sm text-gray-400 hover:text-white transition-colors">
                Marketplace
              </Link>
              <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
                Pricing
              </Link>
              {session ? (
                <Link
                  href="/dashboard"
                  className="px-4 py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Clean & Focused */}
      <section className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          {/* Headline */}
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6">
            Build. Sell. Earn.
          </h1>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Turn app ideas into revenue in minutes. No code required.
          </p>

          {/* Main Input - Like bolt.new */}
          <div className="mb-8">
            <div className="relative bg-white/5 border border-white/10 rounded-2xl p-2 hover:border-white/20 transition-colors">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  placeholder="Describe your app idea..."
                  className="flex-1 bg-transparent text-white placeholder:text-gray-500 px-6 py-4 text-lg focus:outline-none"
                />
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="px-8 py-4 bg-white text-black font-medium rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Generate
                </button>
              </div>
            </div>

            {/* Quick examples */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {[
                'Discord bot',
                'Trading bot',
                'Web scraper',
                'SaaS CRM',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(`Build a ${example}`)}
                  className="px-3 py-1.5 text-sm text-gray-400 bg-white/5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Simple trust indicators */}
          <p className="text-sm text-gray-500">
            Production-ready code • Deploy in 60s • No credit card required
          </p>
        </div>
      </section>

      {/* Value Props - 3 Simple Cards */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Generate</h3>
              <p className="text-gray-400 text-sm">
                AI builds production-ready apps from prompts
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Deploy</h3>
              <p className="text-gray-400 text-sm">
                One-click deployment to Vercel
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Sell</h3>
              <p className="text-gray-400 text-sm">
                List in marketplace, earn revenue
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases - Simple Icons */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            What will you build?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { icon: Bot, label: 'Discord Bots' },
              { icon: TrendingUp, label: 'Trading Bots' },
              { icon: Workflow, label: 'Web Scrapers' },
              { icon: MessageSquare, label: 'Social Tools' },
              { icon: Layers, label: 'SaaS Apps' },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all text-center group cursor-pointer"
              >
                <item.icon className="w-8 h-8 mx-auto mb-3 text-gray-400 group-hover:text-white transition-colors" />
                <div className="text-sm text-gray-400 group-hover:text-white transition-colors">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing - Simple */}
      <section className="py-32">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-sm text-violet-300 mb-6">
              <Sparkles className="w-4 h-4" />
              Limited Offer
            </div>
            <h2 className="text-4xl font-bold mb-4">
              Join 100 Founding Creators
            </h2>
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-6xl font-bold">$299</span>
              <span className="text-gray-400">lifetime</span>
            </div>
            <p className="text-sm text-gray-500 mb-8">
              (normally $99/month)
            </p>

            <div className="space-y-3 mb-10 text-left max-w-sm mx-auto">
              {[
                'Unlimited app generation',
                '0% marketplace fees forever',
                'All features, no limits',
                'Priority support',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-gray-300">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  {feature}
                </div>
              ))}
            </div>

            <Link
              href={session ? '/dashboard' : '/login'}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all group"
            >
              Claim Your Spot
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <p className="text-sm text-gray-500 mt-6">
              87 spots remaining
            </p>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/BASED IN.png"
                alt="AutoForge"
                width={24}
                height={24}
                className="rounded"
              />
              <span className="text-sm text-gray-500">© 2024 AutoForge</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/docs" className="hover:text-white transition-colors">
                Docs
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
