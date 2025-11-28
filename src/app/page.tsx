'use client';

/**
 * AutoForge Landing Page - v0.dev/bolt.new Style
 * 
 * File: src/app/page.tsx
 * 
 * A stunning, modern landing page that matches the aesthetic
 * of v0.dev and bolt.new
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Users
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

// Example prompts that cycle
const examplePrompts = [
  "A todo app with categories and dark mode",
  "An analytics dashboard with charts",
  "A kanban board like Trello",
  "A SaaS landing page with pricing",
  "A real-time chat application",
  "A blog with markdown support",
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

// Stats component
function Stats() {
  const stats = [
    { value: '10K+', label: 'Apps Generated' },
    { value: '50K+', label: 'Developers' },
    { value: '99.9%', label: 'Uptime' },
    { value: '<30s', label: 'Generation Time' },
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
      router.push('/auth/signin');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white overflow-hidden">
      {/* Background Effects */}
      <GradientOrbs />
      <GridPattern />

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">AutoForge</span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
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
                    href="/auth/signin"
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth/signin"
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

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-8">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span>Powered by Claude AI</span>
              <ChevronRight className="w-4 h-4" />
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Describe it.
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                We&#39;ll build it.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              Generate production-ready Next.js applications from a single prompt. 
              Beautiful UI, working code, instant preview.
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

            {/* Quick examples */}
            <div className="flex flex-wrap justify-center gap-2">
              {['Dashboard', 'Landing Page', 'Blog', 'E-commerce', 'Chat App'].map((example) => (
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

      {/* Demo Video / Screenshot Section */}
      <section className="relative py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#1A1A1C] shadow-2xl">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0A0A0B]">
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

      {/* Features Grid */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to ship fast
            </h2>
            <p className="text-lg text-gray-400">
              From idea to production in seconds. AutoForge handles the complexity 
              so you can focus on what matters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Wand2}
              title="AI-Powered Generation"
              description="Describe what you want in plain English. Our AI understands context and generates complete, working applications."
            />
            <FeatureCard 
              icon={Code2}
              title="Production-Ready Code"
              description="Get clean, type-safe TypeScript code with best practices baked in. No more boilerplate."
            />
            <FeatureCard 
              icon={Eye}
              title="Live Preview"
              description="See your app running instantly in the browser. Edit code and watch changes in real-time."
            />
            <FeatureCard 
              icon={Layers}
              title="Full-Stack Apps"
              description="Generate complete applications with frontend, backend, database schemas, and API routes."
            />
            <FeatureCard 
              icon={Rocket}
              title="One-Click Deploy"
              description="Deploy to Vercel, Netlify, or your own infrastructure with a single click."
            />
            <FeatureCard 
              icon={Shield}
              title="Best Practices"
              description="Built-in authentication, form validation, error handling, and accessibility out of the box."
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

      {/* How It Works */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-lg text-gray-400">
              Three simple steps to go from idea to deployed application
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Describe',
                description: 'Tell us what you want to build in plain English. Be as detailed or brief as you like.',
                icon: Terminal,
              },
              {
                step: '02',
                title: 'Generate',
                description: 'Watch as AI generates your complete application with beautiful UI and working functionality.',
                icon: Sparkles,
              },
              {
                step: '03',
                title: 'Deploy',
                description: 'Preview, customize, and deploy your app to production with one click.',
                icon: Globe,
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-white/20 to-transparent -translate-x-1/2" />
                )}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-white/10 mb-6">
                    <item.icon className="w-10 h-10 text-violet-400" />
                  </div>
                  <div className="text-violet-400 text-sm font-mono mb-2">{item.step}</div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/20 via-indigo-600/20 to-cyan-600/20 rounded-3xl blur-2xl" />
            <div className="relative bg-[#1A1A1C] border border-white/10 rounded-2xl p-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to build something amazing?
              </h2>
              <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">
                Join thousands of developers using AutoForge to ship faster than ever.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href={session ? "/dashboard" : "/auth/signin"}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Start Building Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 px-8 py-4 text-white border border-white/20 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Github className="w-5 h-5" />
                  View on GitHub
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
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
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

// Missing icon import
function Eye(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
