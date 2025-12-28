'use client';

/**
 * AutoForge Landing Page - REDESIGNED
 *
 * Premium UI/UX combining best of:
 * - Lovable (conversational, AI-first, visual)
 * - Bolt.new (instant terminal aesthetic, dark premium)
 * - Shopify (professional, trustworthy, conversion-focused)
 *
 * Key improvements:
 * - Enhanced visual hierarchy
 * - Smoother animations and transitions
 * - Interactive elements
 * - Social proof
 * - Better mobile experience
 */

import { useState, useEffect, useRef } from 'react';
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
  Play,
  Check,
  ChevronRight,
  Terminal,
  Wand2,
  DollarSign,
  Store,
  ShoppingBag,
  Coins,
  BarChart3,
  MessageSquare,
  Workflow,
  Bot,
  TrendingUp,
  Users,
  Quote,
  Star,
  ExternalLink,
  Code,
  FileCode,
  Globe,
} from 'lucide-react';

// Animated gradient orbs
function GradientOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
      <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-violet-500/20 rounded-full blur-[120px] animate-blob" />
      <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[120px] animate-blob animation-delay-2000" />
      <div className="absolute -bottom-1/4 left-1/2 w-[700px] h-[700px] bg-indigo-500/20 rounded-full blur-[120px] animate-blob animation-delay-4000" />
    </div>
  );
}

// Grid pattern
function GridPattern() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
  );
}

// Example prompts
const examplePrompts = [
  "A Discord moderation bot with auto-ban and logging...",
  "A crypto trading bot with technical indicators...",
  "A LinkedIn automation tool for lead generation...",
  "A full SaaS CRM with teams and billing...",
  "A web scraper for price monitoring...",
  "A Twitter bot for automated engagement...",
];

// Typing animation
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
    }, isDeleting ? 20 : 40);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentPrompt]);

  return (
    <span className="text-gray-500">
      {displayText}
      <span className="animate-pulse text-violet-400">|</span>
    </span>
  );
}

// Testimonial card
function TestimonialCard({ quote, author, role, revenue }: { quote: string; author: string; role: string; revenue: string }) {
  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group">
      <Quote className="w-8 h-8 text-violet-400/40 mb-4" />
      <p className="text-gray-300 mb-6 leading-relaxed">{quote}</p>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-white">{author}</div>
          <div className="text-sm text-gray-500">{role}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Monthly Revenue</div>
          <div className="text-lg font-bold text-green-400">{revenue}</div>
        </div>
      </div>
    </div>
  );
}

// Live code preview
function LiveCodePreview() {
  const [activeTab, setActiveTab] = useState<'bot' | 'trading' | 'scraper'>('bot');

  const examples = {
    bot: {
      title: 'Discord Bot',
      files: ['bot.ts', 'commands/', 'events/', 'database/'],
      preview: `import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

client.on('ready', () => {
  console.log(\`Logged in as \${client.user.tag}\`);
});`,
    },
    trading: {
      title: 'Trading Bot',
      files: ['strategy.ts', 'indicators/', 'backtester/', 'risk/'],
      preview: `import { TechnicalIndicators } from './indicators';

class TradingStrategy {
  async analyze(candles: OHLC[]) {
    const rsi = TechnicalIndicators.RSI(candles);
    const macd = TechnicalIndicators.MACD(candles);

    if (rsi < 30 && macd.histogram > 0) {
      return { action: 'BUY', confidence: 0.85 };
    }
  }
}`,
    },
    scraper: {
      title: 'Web Scraper',
      files: ['scraper.ts', 'parsers/', 'queue/', 'storage/'],
      preview: `import puppeteer from 'puppeteer';

class PriceScraper {
  async scrape(url: string) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url);
    const price = await page.$eval('.price',
      el => el.textContent
    );
  }
}`,
    },
  };

  const current = examples[activeTab];

  return (
    <div className="bg-[#1A1A1C] border border-white/10 rounded-2xl overflow-hidden">
      {/* Browser Chrome */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0A0A0B]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex items-center gap-2">
          {(['bot', 'trading', 'scraper'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-white/10 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {examples[tab].title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4">
        {/* File Tree */}
        <div className="border-r border-white/10 bg-[#0F0F10] p-4">
          <div className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Files</div>
          <div className="space-y-1.5">
            {current.files.map((file, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
                <FileCode className="w-4 h-4" />
                <span>{file}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Code Editor */}
        <div className="col-span-3 p-6 font-mono text-sm">
          <pre className="text-gray-300 leading-relaxed">
            <code>{current.preview}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (session) {
      router.push(`/dashboard?prompt=${encodeURIComponent(prompt)}`);
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white overflow-hidden">
      {/* Background Effects */}
      <GradientOrbs />
      <GridPattern />

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5 backdrop-blur-xl bg-[#0A0A0B]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-10">
              <Link href="/" className="flex items-center gap-2 group">
                <Image
                  src="/BASED IN.png"
                  alt="AutoForge"
                  width={40}
                  height={40}
                  className="rounded-lg group-hover:scale-105 transition-transform"
                />
                <span className="font-bold text-xl">AutoForge</span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                {[
                  { href: '/marketplace', label: 'Marketplace', icon: Store },
                  { href: '/pricing', label: 'Pricing', icon: DollarSign },
                  { href: '/docs', label: 'Docs', icon: Code },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {session ? (
                <Link
                  href="/dashboard"
                  className="px-5 py-2.5 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
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
                    className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/20"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-16">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-cyan-500/10 border border-violet-500/20 text-sm text-violet-300 mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="font-medium">The Shopify for Software</span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1] animate-fade-in-up">
              Build. Monetize.
              <br />
              <span className="relative inline-block mt-2">
                <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                  Sell Software.
                </span>
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 blur-2xl -z-10" />
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up animation-delay-100">
              Generate production-ready apps from a single prompt.{' '}
              <span className="text-white font-medium">Discord bots, trading systems, scrapers, SaaS platforms.</span>{' '}
              Monetize instantly and sell on our marketplace.
            </p>

            {/* Main Input */}
            <div className="max-w-3xl mx-auto mb-8 animate-fade-in-up animation-delay-200">
              <div className="relative group">
                {/* Glow effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 rounded-2xl blur-2xl opacity-20 group-hover:opacity-40 group-focus-within:opacity-40 transition-opacity" />

                {/* Input container */}
                <div className="relative bg-[#1A1A1C] border border-white/10 group-focus-within:border-white/20 rounded-2xl p-2 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && prompt && handleGenerate()}
                        placeholder=""
                        className="w-full bg-transparent text-white placeholder:text-gray-500 px-6 py-4 text-lg focus:outline-none"
                      />
                      {!prompt && (
                        <div className="absolute inset-0 px-6 py-4 text-lg pointer-events-none">
                          <TypingPrompt />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleGenerate}
                      disabled={!prompt || isGenerating}
                      className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-105"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-5 h-5" />
                          Generate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick examples */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {['Discord Bot', 'Trading Bot', 'Web Scraper', 'SaaS Platform'].map((example) => (
                  <button
                    key={example}
                    onClick={() => setPrompt(`A ${example.toLowerCase()}`)}
                    className="px-4 py-2 text-sm text-gray-400 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500 animate-fade-in-up animation-delay-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span>Production-ready code</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span>Deploy in 60s</span>
              </div>
            </div>
          </div>

          {/* Live Code Preview */}
          <div className="max-w-5xl mx-auto animate-fade-in-up animation-delay-400">
            <LiveCodePreview />
          </div>
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="relative py-20 bg-gradient-to-b from-white/[0.02] to-transparent border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <h2 className="text-3xl font-bold mb-3">
              Loved by 1,000+ creators
            </h2>
            <p className="text-gray-400">
              Real people earning real money building and selling apps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="I generated a Discord moderation bot, listed it on the marketplace, and made $2,400 in the first month. This is insane."
              author="Sarah Chen"
              role="Indie Maker"
              revenue="$2.4K/mo"
            />
            <TestimonialCard
              quote="Built a crypto price alert bot in 2 minutes. Now I have 89 paying customers. AutoForge handles everything - hosting, payments, support."
              author="Marcus Johnson"
              role="Developer"
              revenue="$1.8K/mo"
            />
            <TestimonialCard
              quote="As a non-developer, I never thought I could build and sell software. AutoForge made it possible. I'm earning passive income now!"
              author="Emily Rodriguez"
              role="Marketing Manager"
              revenue="$950/mo"
            />
          </div>
        </div>
      </section>

      {/* Complex App Types */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Build Complex Applications
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Not just simple dashboards. Generate production-grade bots, trading systems,
              scrapers, and full SaaS platforms with 30-50+ files.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { icon: Bot, label: 'Discord Bots', desc: 'Moderation, music, games', gradient: 'from-indigo-500 to-purple-500' },
              { icon: TrendingUp, label: 'Trading Bots', desc: 'Crypto & stock alerts', gradient: 'from-green-500 to-emerald-500' },
              { icon: Workflow, label: 'Web Scrapers', desc: 'Price tracking, data', gradient: 'from-orange-500 to-red-500' },
              { icon: MessageSquare, label: 'Social Automation', desc: 'Twitter, LinkedIn', gradient: 'from-blue-500 to-cyan-500' },
              { icon: Layers, label: 'SaaS Platforms', desc: 'Full-stack apps', gradient: 'from-violet-500 to-pink-500' },
            ].map((item, i) => (
              <div key={i} className="group bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:from-white/10 transition-all cursor-pointer">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1">{item.label}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Monetization */}
      <section className="relative py-24 bg-gradient-to-b from-white/[0.02] to-transparent border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-sm text-green-400 font-medium mb-6">
                <DollarSign className="w-4 h-4" />
                Instant Monetization
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
                Turn Your Apps Into Revenue Streams
              </h2>
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                One-click Stripe Connect integration. Set your price, connect your bank,
                and start earning within minutes. We handle everything else.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Check, text: 'Stripe Connect setup in 2 minutes' },
                  { icon: Check, text: '90% revenue share (you keep 90%)' },
                  { icon: Check, text: 'Weekly automatic payouts' },
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
              {/* Glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-3xl blur-3xl" />

              {/* Card */}
              <div className="relative bg-[#1A1A1C] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Monthly Revenue</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-5xl font-bold text-white">$4,250</div>
                      <div className="text-green-400 text-sm font-semibold px-2 py-1 bg-green-400/10 rounded-md">
                        +23%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-3xl font-bold text-white mb-1">156</div>
                      <div className="text-sm text-gray-500">Active Customers</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-3xl font-bold text-white mb-1">$27</div>
                      <div className="text-sm text-gray-500">Avg. per Customer</div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Next payout</div>
                        <div className="text-white font-semibold">In 3 days</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-400">$1,250</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              From Idea to Revenue in Minutes
            </h2>
            <p className="text-lg text-gray-400">
              Four simple steps to start building and earning
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Describe',
                description: 'Tell us what you want to build. Be specific about features and functionality.',
                icon: Terminal,
                color: 'violet',
              },
              {
                step: '02',
                title: 'Generate',
                description: 'AI generates 30-50+ production files with complete functionality in 60-90 seconds.',
                icon: Sparkles,
                color: 'indigo',
              },
              {
                step: '03',
                title: 'Monetize',
                description: 'Connect Stripe, set your price, and publish to our marketplace of 10K+ buyers.',
                icon: DollarSign,
                color: 'cyan',
              },
              {
                step: '04',
                title: 'Earn',
                description: 'Receive weekly payouts as customers subscribe. Track revenue in real-time.',
                icon: TrendingUp,
                color: 'green',
              },
            ].map((item, i) => (
              <div key={i} className="relative group">
                {i < 3 && (
                  <div className="hidden md:block absolute top-14 left-full w-full h-px bg-gradient-to-r from-white/20 via-white/10 to-transparent -translate-x-1/2" />
                )}
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-28 h-28 rounded-2xl bg-gradient-to-br from-${item.color}-500/10 to-${item.color}-500/5 border border-white/10 mb-6 group-hover:scale-110 group-hover:border-${item.color}-500/30 transition-all`}>
                    <item.icon className={`w-12 h-12 text-${item.color}-400`} />
                  </div>
                  <div className={`text-${item.color}-400 text-sm font-mono font-semibold mb-3`}>{item.step}</div>
                  <h3 className="text-xl font-bold mb-3 text-white">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-8 bg-gradient-to-r from-violet-600/20 via-indigo-600/20 to-cyan-600/20 rounded-3xl blur-3xl" />

            {/* Content */}
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-16 backdrop-blur-sm">
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
                Ready to start building<br />and earning?
              </h2>
              <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
                Join 1,000+ creators earning passive income by building and selling
                AI-generated apps on AutoForge.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href={session ? "/dashboard" : "/login"}
                  className="group inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-105"
                >
                  Start Building Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 px-10 py-5 text-white border border-white/20 rounded-xl hover:bg-white/5 hover:border-white/30 transition-all"
                >
                  <Store className="w-5 h-5" />
                  Browse Marketplace
                </Link>
              </div>

              {/* Trust bar */}
              <div className="flex items-center justify-center gap-6 mt-10 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>1,000+ creators</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-700" />
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4" />
                  <span>10K+ apps generated</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-700" />
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  <span>5.0 rating</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 border-t border-white/5 bg-[#0A0A0B]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/BASED IN.png"
                alt="AutoForge"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <div>
                <div className="font-bold">AutoForge</div>
                <div className="text-sm text-gray-500">The Shopify for Software</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
              <Link href="https://github.com" className="hover:text-white transition-colors flex items-center gap-1">
                GitHub <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="text-sm text-gray-500">
              © 2024 AutoForge. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }

        .animation-delay-100 {
          animation-delay: 0.1s;
          animation-fill-mode: both;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
          animation-fill-mode: both;
        }

        .animation-delay-300 {
          animation-delay: 0.3s;
          animation-fill-mode: both;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
}
