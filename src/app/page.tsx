'use client';

/**
 * AutoForge Landing Page - Premium Minimal
 *
 * State-of-the-art design: Minimal but visually stunning
 * Inspired by Linear, Vercel, Stripe, Framer
 */

import { useState, useEffect } from 'react';
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
  Check,
  Play,
  Code2,
  Terminal,
  Eye,
} from 'lucide-react';

// Animated gradient background
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />

      {/* Animated orbs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
        style={{
          maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)',
        }}
      />
    </div>
  );
}

// Typing animation for placeholder
function TypingPlaceholder() {
  const prompts = [
    'Build a Discord bot with auto-moderation...',
    'Create a crypto trading bot with alerts...',
    'Build a SaaS CRM with team management...',
    'Make a web scraper for price monitoring...',
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const fullText = prompts[currentIndex];

      if (!isDeleting) {
        if (currentText.length < fullText.length) {
          setCurrentText(fullText.slice(0, currentText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % prompts.length);
        }
      }
    }, isDeleting ? 30 : 60);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentIndex]);

  return (
    <span className="text-gray-500">
      {currentText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

// Feature card with hover effect
function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500" />
      <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
          <Icon className="w-6 h-6 text-purple-400" />
        </div>
        <h3 className="text-xl font-semibold mb-3">{title}</h3>
        <p className="text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// Stats counter animation
function StatsCounter({ value, label, suffix = '' }: { value: string; label: string; suffix?: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
        {value}{suffix}
      </div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    if (session) {
      router.push(`/generate?prompt=${encodeURIComponent(prompt)}`);
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AnimatedBackground />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-black/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/BASED IN.png"
                alt="AutoForge"
                width={32}
                height={32}
                className="rounded-lg group-hover:scale-110 transition-transform"
              />
              <span className="font-semibold text-lg">AutoForge</span>
            </Link>

            <div className="flex items-center gap-8">
              <div className="hidden md:flex items-center gap-8">
                <Link href="/marketplace" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Marketplace
                </Link>
                <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Pricing
                </Link>
                <Link href="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Docs
                </Link>
              </div>

              {session ? (
                <Link
                  href="/dashboard"
                  className="px-5 py-2.5 text-sm font-medium bg-white text-black rounded-xl hover:bg-gray-100 transition-all hover:scale-105"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="px-5 py-2.5 text-sm font-medium bg-white text-black rounded-xl hover:bg-gray-100 transition-all hover:scale-105"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-gray-300">Powering the next generation of builders</span>
            </div>
          </div>

          {/* Headline */}
          <div className="text-center mb-8 animate-fade-in-up">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.1]">
              Build. Sell.
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                Earn Revenue.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Generate production-ready applications from a single prompt.
              Deploy instantly. Monetize immediately.
            </p>
          </div>

          {/* Main Input */}
          <div className="max-w-4xl mx-auto mb-12 animate-fade-in-up animation-delay-200">
            <div
              className="relative group"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Glow effect */}
              <div className={`absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-lg transition-opacity duration-500 ${isHovered ? 'opacity-30' : 'opacity-0'}`} />

              {/* Input container */}
              <div className="relative flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2 group-hover:border-white/20 transition-all">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    className="w-full bg-transparent text-white placeholder:text-gray-500 px-6 py-5 text-lg focus:outline-none"
                    placeholder=""
                  />
                  {!prompt && (
                    <div className="absolute inset-0 px-6 py-5 text-lg pointer-events-none">
                      <TypingPlaceholder />
                    </div>
                  )}
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="group/btn flex items-center gap-2 px-8 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50"
                >
                  <Sparkles className="w-5 h-5" />
                  Generate
                  <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Quick examples */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {[
                { icon: Bot, label: 'Discord Bot' },
                { icon: TrendingUp, label: 'Trading Bot' },
                { icon: Code2, label: 'Web Scraper' },
                { icon: Layers, label: 'SaaS App' },
              ].map((example) => (
                <button
                  key={example.label}
                  onClick={() => setPrompt(`Build a ${example.label.toLowerCase()}`)}
                  className="group/tag flex items-center gap-2 px-4 py-2 text-sm text-gray-400 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
                >
                  <example.icon className="w-4 h-4" />
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-8 border-t border-white/10">
            <StatsCounter value="60" label="Seconds to deploy" suffix="s" />
            <StatsCounter value="100" label="Production files" suffix="+" />
            <StatsCounter value="99" label="Success rate" suffix="%" />
          </div>
        </div>
      </section>

      {/* Demo Preview */}
      <section className="relative py-20 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="relative group">
            {/* Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />

            {/* Demo container */}
            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Terminal className="w-4 h-4" />
                  <span>Production-Ready Code</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Code preview */}
              <div className="p-8 font-mono text-sm">
                <pre className="text-gray-300 leading-relaxed">
                  <code className="language-typescript">
{`// Generated in 60 seconds
import { Client } from 'discord.js';
import { Database } from './database';
import { CommandHandler } from './commands';

const bot = new Client({
  intents: ['GUILDS', 'GUILD_MESSAGES'],
});

bot.on('ready', () => {
  console.log(\`✓ Bot is online as \${bot.user.tag}\`);
});

export default bot;`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-32 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Everything you need to build and sell
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              From idea to revenue in minutes. No infrastructure, no setup, no complexity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Zap}
              title="AI-Powered Generation"
              description="Production-ready applications with complete functionality, tests, and documentation. Not templates—real, custom code."
            />
            <FeatureCard
              icon={Rocket}
              title="Instant Deployment"
              description="One-click deployment to Vercel with automatic CI/CD, environment variables, and custom domains."
            />
            <FeatureCard
              icon={DollarSign}
              title="Built-in Monetization"
              description="Stripe Connect integration, marketplace listing, customer management, and automated payouts."
            />
            <FeatureCard
              icon={Layers}
              title="Complete Tech Stack"
              description="Next.js, TypeScript, PostgreSQL, Prisma, Auth, Payments. Everything configured and ready to scale."
            />
            <FeatureCard
              icon={Terminal}
              title="Full Code Access"
              description="Own your code completely. Download, modify, and deploy anywhere. No vendor lock-in."
            />
            <FeatureCard
              icon={TrendingUp}
              title="Real-time Analytics"
              description="Track revenue, customers, and performance. Understand what's working and optimize for growth."
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative py-20 px-6 lg:px-8 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Build anything
            </h2>
            <p className="text-xl text-gray-400">
              From simple bots to complex SaaS platforms
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { icon: Bot, label: 'Discord Bots', color: 'from-blue-500 to-cyan-500' },
              { icon: TrendingUp, label: 'Trading Bots', color: 'from-green-500 to-emerald-500' },
              { icon: Workflow, label: 'Web Scrapers', color: 'from-orange-500 to-red-500' },
              { icon: MessageSquare, label: 'Social Tools', color: 'from-purple-500 to-pink-500' },
              { icon: Layers, label: 'SaaS Platforms', color: 'from-indigo-500 to-purple-500' },
            ].map((item) => (
              <div
                key={item.label}
                className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <div className="font-medium text-white group-hover:text-white transition-colors">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative py-32 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm text-purple-300 mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Limited Time Offer</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Join 100 Founding Creators
            </h2>
            <p className="text-xl text-gray-400">
              Lock in lifetime access before we switch to monthly pricing
            </p>
          </div>

          <div className="relative group">
            {/* Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />

            {/* Pricing card */}
            <div className="relative bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-12">
              <div className="text-center mb-10">
                <div className="flex items-baseline justify-center gap-3 mb-3">
                  <span className="text-7xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    $299
                  </span>
                  <span className="text-2xl text-gray-400">lifetime</span>
                </div>
                <p className="text-gray-400">
                  <span className="line-through">$99/month</span> · Save $1,188/year
                </p>
              </div>

              <div className="space-y-4 mb-10">
                {[
                  'Unlimited app generation',
                  '0% marketplace fees forever',
                  'All features included',
                  'Priority support',
                  'Early access to new features',
                  'Founding member badge',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              <Link
                href={session ? '/dashboard' : '/login'}
                className="group/btn w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50"
              >
                Claim Your Spot
                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
              </Link>

              <p className="text-center text-sm text-gray-500 mt-6">
                Only 87 spots remaining · No credit card required to start
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/BASED IN.png"
                alt="AutoForge"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <div>
                <div className="font-semibold">AutoForge</div>
                <div className="text-sm text-gray-500">Build. Sell. Earn.</div>
              </div>
            </div>

            <div className="flex items-center gap-8 text-sm text-gray-400">
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

            <div className="text-sm text-gray-500">
              © 2024 AutoForge. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
