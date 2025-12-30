'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Zap, Rocket, DollarSign } from 'lucide-react';

// Animated orb background (like Bolt.new)
function OrbBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-black" />

      {/* Main glowing orb - like bolt.new */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-blue-600/30 to-cyan-600/30 rounded-full blur-[120px] animate-pulse-slow" />
      </div>

      {/* Secondary orbs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[100px] animate-blob" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:64px_64px]"
        style={{
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 60%, transparent 100%)',
        }}
      />
    </div>
  );
}

// Typing effect for input
function TypingEffect() {
  const examples = [
    'Build a Discord moderation bot...',
    'Create a crypto trading bot...',
    'Build a SaaS CRM with billing...',
    'Make a LinkedIn automation tool...',
  ];

  const [text, setText] = useState('');
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const current = examples[index];

      if (!isDeleting) {
        if (text.length < current.length) {
          setText(current.slice(0, text.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (text.length > 0) {
          setText(text.slice(0, -1));
        } else {
          setIsDeleting(false);
          setIndex((index + 1) % examples.length);
        }
      }
    }, isDeleting ? 30 : 60);

    return () => clearTimeout(timeout);
  }, [text, isDeleting, index]);

  return (
    <span className="text-gray-500">
      {text}
      <span className="animate-pulse">|</span>
    </span>
  );
}

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
    <div className="min-h-screen bg-black text-white">
      <OrbBackground />

      {/* Minimal Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/BASED IN.png" alt="AutoForge" width={28} height={28} className="rounded-lg" />
              <span className="font-semibold">AutoForge</span>
            </Link>

            <div className="flex items-center gap-8">
              <Link href="/marketplace" className="text-sm text-gray-400 hover:text-white transition-colors hidden md:block">
                Marketplace
              </Link>
              <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors hidden md:block">
                Pricing
              </Link>
              <Link
                href={session ? '/dashboard' : '/login'}
                className="px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
              >
                {session ? 'Dashboard' : 'Sign in'}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero - Massive & Bold like Linear */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="max-w-5xl mx-auto text-center pt-16">

          {/* Headline - Huge & Bold */}
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight mb-8 leading-[0.95]">
            <span className="block mb-4">Build. Sell.</span>
            <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Earn Revenue.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-400 mb-16 max-w-3xl mx-auto font-light">
            Generate production-ready apps from a single prompt.
            <br />
            Deploy instantly. Monetize immediately.
          </p>

          {/* Main Input - Like Bolt.new */}
          <div className="max-w-3xl mx-auto mb-16">
            <div className="relative group">
              {/* Glow effect on focus */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500" />

              {/* Input */}
              <div className="relative flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 transition-all group-hover:border-white/20">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    className="w-full bg-transparent text-white text-lg px-6 py-4 focus:outline-none"
                    placeholder=""
                  />
                  {!prompt && (
                    <div className="absolute inset-0 px-6 py-4 text-lg pointer-events-none">
                      <TypingEffect />
                    </div>
                  )}
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-xl hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 transition-all hover:scale-105"
                >
                  <Sparkles className="w-5 h-5" />
                  Generate
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Small trust line */}
            <p className="text-sm text-gray-500 mt-6">
              Production-ready · Deploy in 60s · No credit card required
            </p>
          </div>

        </div>
      </section>

      {/* Feature Section - Minimal Cards */}
      <section className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Everything you need
            </h2>
            <p className="text-xl text-gray-400">
              From idea to revenue in minutes
            </p>
          </div>

          {/* 3 Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-10 hover:border-white/20 transition-all">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl opacity-0 group-hover:opacity-100 blur transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <Zap className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Generate</h3>
                <p className="text-gray-400 leading-relaxed">
                  AI builds production-ready apps with complete functionality
                </p>
              </div>
            </div>

            <div className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-10 hover:border-white/20 transition-all">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl opacity-0 group-hover:opacity-100 blur transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <Rocket className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Deploy</h3>
                <p className="text-gray-400 leading-relaxed">
                  One-click deployment to Vercel with automatic CI/CD
                </p>
              </div>
            </div>

            <div className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-10 hover:border-white/20 transition-all">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-600 to-green-600 rounded-3xl opacity-0 group-hover:opacity-100 blur transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-green-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <DollarSign className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Monetize</h3>
                <p className="text-gray-400 leading-relaxed">
                  List in marketplace and earn revenue automatically
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Single Premium Card */}
      <section className="relative py-32 px-6">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300 mb-6">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Limited Time Offer
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-4">
              Join 100 Founding Creators
            </h2>
            <p className="text-xl text-gray-400">
              Lock in lifetime access before monthly pricing
            </p>
          </div>

          {/* Pricing Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />

            <div className="relative bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl p-12">

              {/* Price */}
              <div className="text-center mb-10">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-7xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    $299
                  </span>
                  <span className="text-2xl text-gray-400">lifetime</span>
                </div>
                <p className="text-gray-500">
                  <span className="line-through">$99/month</span> · Save $1,188/year
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-10">
                {[
                  'Unlimited app generation',
                  '0% marketplace fees forever',
                  'All features included',
                  'Priority support',
                  'Early access to features',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                    </div>
                    {feature}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link
                href={session ? '/dashboard' : '/login'}
                className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all hover:scale-105 group"
              >
                Claim Your Spot
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <p className="text-center text-sm text-gray-500 mt-6">
                87 spots remaining
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/BASED IN.png" alt="AutoForge" width={24} height={24} className="rounded" />
            <span className="text-sm text-gray-500">© 2024 AutoForge</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
