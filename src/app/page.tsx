'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Check, Loader2, FileCode, Terminal as TerminalIcon } from 'lucide-react';

// Typing effect for placeholder
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
  const [step, setStep] = useState(0);
  const [codeLines, setCodeLines] = useState<string[]>([]);

  const steps = [
    { text: 'Analyzing prompt...', status: 'complete' },
    { text: 'Creating project structure', status: 'complete' },
    { text: 'Generating bot.ts', status: 'progress' },
    { text: 'Installing dependencies', status: 'pending' },
    { text: 'Deploying to Vercel', status: 'pending' },
  ];

  const code = `import { Client, GatewayIntentBits } from 'discord.js';
import { Database } from './database';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

client.on('ready', () => {
  console.log(\`✓ Bot online\`);
});`;

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(stepInterval);
  }, []);

  useEffect(() => {
    let currentLine = 0;
    const lines = code.split('\n');
    const codeInterval = setInterval(() => {
      if (currentLine < lines.length) {
        setCodeLines((prev) => [...prev, lines[currentLine]]);
        currentLine++;
      } else {
        setCodeLines([]);
        currentLine = 0;
      }
    }, 200);
    return () => clearInterval(codeInterval);
  }, []);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    if (session) {
      router.push(`/generate?prompt=${encodeURIComponent(prompt)}`);
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Dark gradient background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-black via-gray-900 to-black" />

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

      {/* Hero with Tilted UI Showcase */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="max-w-7xl mx-auto w-full">

          {/* Headline above showcase */}
          <div className="text-center mb-12">
            <h1 className="text-6xl md:text-7xl font-bold mb-4">
              Build. Sell. <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Earn Revenue.</span>
            </h1>
            <p className="text-xl text-gray-400">
              Watch your app come to life in 60 seconds
            </p>
          </div>

          {/* 3D Tilted Showcase - Like Linear */}
          <div className="flex items-center justify-center">
            <div
              className="relative w-full max-w-6xl"
              style={{
                transform: 'perspective(1500px) rotateX(6deg) rotateY(-8deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Main container with all windows */}
              <div className="relative h-[600px]">

                {/* Input Window - CENTER (Main Focus) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] z-30">
                  <div className="bg-black/90 backdrop-blur-xl border border-white/30 rounded-2xl overflow-hidden shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      </div>
                      <div className="text-sm text-gray-400 ml-2">Generate App</div>
                    </div>

                    {/* Input Field */}
                    <div className="p-6">
                      <div className="flex items-center gap-3 bg-white/5 border border-white/20 rounded-xl p-3 hover:border-white/40 transition-colors">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                            className="w-full bg-transparent text-white text-lg px-4 py-3 focus:outline-none"
                            placeholder=""
                          />
                          {!prompt && (
                            <div className="absolute inset-0 px-4 py-3 text-lg pointer-events-none">
                              <TypingEffect />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleGenerate}
                          disabled={!prompt.trim()}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 transition-all"
                        >
                          <Sparkles className="w-5 h-5" />
                          Generate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terminal Window - LEFT */}
                <div className="absolute top-32 left-0 w-[550px] z-20">
                  <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400 ml-2">
                        <TerminalIcon className="w-4 h-4" />
                        <span>Terminal</span>
                      </div>
                    </div>
                    <div className="p-8 font-mono text-base space-y-4 h-[280px]">
                      {steps.map((s, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 transition-all ${
                            i <= step ? 'opacity-100' : 'opacity-40'
                          }`}
                        >
                          {i < step ? (
                            <Check className="w-5 h-5 text-green-400" />
                          ) : i === step ? (
                            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                          )}
                          <span className={i <= step ? 'text-gray-300' : 'text-gray-600'}>
                            {s.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Code Editor Window - RIGHT */}
                <div className="absolute top-32 right-0 w-[550px] z-20">
                  <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <FileCode className="w-4 h-4" />
                        <span>bot.ts</span>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      </div>
                    </div>
                    <div className="p-8 font-mono text-sm leading-relaxed h-[280px] overflow-hidden">
                      {codeLines.map((line, i) => (
                        <div key={i} className="text-gray-300">
                          <span className="text-gray-600 mr-4">{i + 1}</span>
                          <span className={line?.includes('import') ? 'text-blue-400' : 'text-gray-300'}>
                            {line || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview Window - BOTTOM CENTER */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] z-10">
                  <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                      <div className="text-sm text-gray-400">Console Output</div>
                    </div>
                    <div className="p-6 font-mono text-xs space-y-2">
                      <div className="text-green-400">✓ Bot is online as AutoBot#1234</div>
                      <div className="text-blue-400">→ Connected to 5 servers</div>
                      <div className="text-gray-500">Listening for commands...</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Trust line below */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Production-ready · Deploy in 60s · No credit card required
            </p>
          </div>

        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-2xl mx-auto">
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

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="relative bg-black/80 backdrop-blur-xl border border-white/20 rounded-3xl p-12">
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
