'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Check, Loader2, FileCode, Terminal as TerminalIcon, Zap, Rocket, DollarSign } from 'lucide-react';

// Mouse parallax hook
function useMousePosition() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return mousePosition;
}

// Animated background with gradient mesh
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />

      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-purple-500/20 rounded-full blur-[150px] animate-blob" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[150px] animate-blob animation-delay-2000" />
      <div className="absolute bottom-0 left-1/2 w-[700px] h-[700px] bg-cyan-500/20 rounded-full blur-[150px] animate-blob animation-delay-4000" />

      {/* Subtle grain texture */}
      <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]" />
    </div>
  );
}

// Floating grid particles
function FloatingGrid() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_60%,transparent_100%)]" />
    </div>
  );
}

// Typing effect
function TypingEffect() {
  const examples = [
    'Build a Discord moderation bot with auto-ban...',
    'Create a crypto trading bot with alerts...',
    'Build a SaaS CRM with team management...',
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

// Feature card with hover effect
function FeatureCard({ icon: Icon, title, description, gradient }: any) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect */}
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${gradient} rounded-3xl opacity-0 blur transition-all duration-500 ${isHovered ? 'opacity-75' : ''}`} />

      {/* Card */}
      <div className="relative h-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all">
        <div className={`w-16 h-16 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center mb-6 transition-transform ${isHovered ? 'scale-110 rotate-3' : ''}`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold mb-3">{title}</h3>
        <p className="text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [step, setStep] = useState(0);
  const [codeLines, setCodeLines] = useState<string[]>([]);
  const mousePosition = useMousePosition();
  const showcaseRef = useRef<HTMLDivElement>(null);

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

  // Calculate parallax offset based on mouse position
  const getParallaxOffset = (strength: number = 20) => {
    if (!showcaseRef.current) return { x: 0, y: 0 };
    const rect = showcaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (mousePosition.x - centerX) / rect.width;
    const deltaY = (mousePosition.y - centerY) / rect.height;
    return {
      x: deltaX * strength,
      y: deltaY * strength,
    };
  };

  const parallax = getParallaxOffset(15);

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
      <AnimatedBackground />
      <FloatingGrid />

      {/* Minimal Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/20 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <Image src="/BASED IN.png" alt="AutoForge" width={28} height={28} className="rounded-lg group-hover:scale-110 transition-transform" />
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
                className="px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-gray-100 transition-all hover:scale-105"
              >
                {session ? 'Dashboard' : 'Sign in'}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero with Interactive 3D Showcase */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="max-w-7xl mx-auto w-full">

          {/* Headline */}
          <div className="text-center mb-16 animate-fade-in-up">
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-bold mb-6 leading-[0.9] tracking-tight">
              <span className="block mb-2">Forge Apps.</span>
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                Build Empires.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Watch your app materialize in <span className="text-white font-semibold">60 seconds</span>.
              <br />
              From imagination to production. Instantly.
            </p>
          </div>

          {/* Interactive 3D Tilted Showcase */}
          <div className="flex items-center justify-center" ref={showcaseRef}>
            <div
              className="relative w-full max-w-6xl transition-transform duration-200 ease-out"
              style={{
                transform: `perspective(1500px) rotateX(${6 + parallax.y * 0.5}deg) rotateY(${-8 + parallax.x * 0.5}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              <div className="relative h-[650px]">

                {/* Input Window - CENTER */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[750px] z-30 transition-transform duration-200"
                  style={{ transform: `translateZ(40px) translateX(${parallax.x * 2}px) translateY(${parallax.y * 2}px)` }}
                >
                  <div className="bg-black/95 backdrop-blur-2xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/10">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/[0.02]">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                      <div className="text-sm text-gray-400 ml-2 font-medium">Generate App</div>
                    </div>

                    <div className="p-8">
                      <div className="flex items-center gap-3 bg-white/5 border border-white/20 rounded-xl p-4 hover:border-white/40 hover:bg-white/10 transition-all group">
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
                          className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
                        >
                          <Sparkles className="w-5 h-5" />
                          Forge
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terminal - LEFT */}
                <div
                  className="absolute top-40 left-0 w-[580px] z-20 transition-transform duration-200"
                  style={{ transform: `translateZ(20px) translateX(${parallax.x}px) translateY(${parallax.y}px)` }}
                >
                  <div className="bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
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
                    <div className="p-8 font-mono text-base space-y-4 h-[300px]">
                      {steps.map((s, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 transition-all duration-500 ${
                            i <= step ? 'opacity-100 translate-x-0' : 'opacity-40 translate-x-2'
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

                {/* Code Editor - RIGHT */}
                <div
                  className="absolute top-40 right-0 w-[580px] z-20 transition-transform duration-200"
                  style={{ transform: `translateZ(20px) translateX(${-parallax.x}px) translateY(${parallax.y}px)` }}
                >
                  <div className="bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
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
                    <div className="p-8 font-mono text-sm leading-relaxed h-[300px] overflow-hidden">
                      {codeLines.map((line, i) => (
                        <div key={i} className="text-gray-300 animate-fade-in">
                          <span className="text-gray-600 mr-4">{i + 1}</span>
                          <span className={line?.includes('import') ? 'text-blue-400' : 'text-gray-300'}>
                            {line || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Console - BOTTOM */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[520px] z-10 transition-transform duration-200"
                  style={{ transform: `translateZ(10px) translateY(${parallax.y * 0.5}px)` }}
                >
                  <div className="bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                      <div className="text-sm text-gray-400">Console Output</div>
                    </div>
                    <div className="p-6 font-mono text-sm space-y-2">
                      <div className="text-green-400">✓ Bot is online as AutoBot#1234</div>
                      <div className="text-blue-400">→ Connected to 5 servers</div>
                      <div className="text-gray-500">Listening for commands...</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Trust line */}
          <div className="text-center mt-12 animate-fade-in-up animation-delay-200">
            <p className="text-sm text-gray-500">
              Production-ready · Deploy in 60s · No credit card required
            </p>
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Everything you need
            </h2>
            <p className="text-xl text-gray-400">
              From idea to revenue in minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Zap}
              title="Generate"
              description="AI builds production-ready apps with complete functionality, tests, and documentation"
              gradient="from-purple-600 to-blue-600"
            />
            <FeatureCard
              icon={Rocket}
              title="Deploy"
              description="One-click deployment to Vercel with automatic CI/CD and custom domains"
              gradient="from-blue-600 to-cyan-600"
            />
            <FeatureCard
              icon={DollarSign}
              title="Monetize"
              description="List in marketplace, earn revenue automatically with Stripe Connect"
              gradient="from-cyan-600 to-green-600"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
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
            <div className="relative bg-black/80 backdrop-blur-xl border border-white/20 rounded-3xl p-12 hover:border-white/30 transition-all">
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
                className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 group"
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
